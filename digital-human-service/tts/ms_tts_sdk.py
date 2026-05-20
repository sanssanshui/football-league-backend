import time
import asyncio
import azure.cognitiveservices.speech as speechsdk
from tts import tts_voice
from tts.tts_voice import EnumVoice
from utils import util, config_util
from utils import config_util as cfg
import edge_tts

# pydub is optional — only needed for server-side WAV conversion.
# The frontend handles MP3→WAV via Web Audio API, so pydub is not required.
try:
    from pydub import AudioSegment
    HAS_PYDUB = True
except ImportError:
    HAS_PYDUB = False

class Speech:
    def __init__(self):
        self.ms_tts = False
        voice_type = tts_voice.get_voice_of(config_util.config["attribute"]["voice"] if config_util.config["attribute"]["voice"] is not None and config_util.config["attribute"]["voice"].strip() != "" else "晓晓(edge)")
        voice_name = EnumVoice.XIAO_XIAO.value["voiceName"]
        if voice_type is not None:
            voice_name = voice_type.value["voiceName"]
        if config_util.key_ms_tts_key and config_util.key_ms_tts_key is not None and config_util.key_ms_tts_key.strip() != "":
            self.__speech_config = speechsdk.SpeechConfig(subscription=cfg.key_ms_tts_key, region=cfg.key_ms_tts_region)
            self.__speech_config.speech_recognition_language = "zh-CN"
            self.__speech_config.speech_synthesis_voice_name = voice_name
            self.__speech_config.set_speech_synthesis_output_format(speechsdk.SpeechSynthesisOutputFormat.Riff16Khz16BitMonoPcm)
            self.__synthesizer = speechsdk.SpeechSynthesizer(speech_config=self.__speech_config, audio_config=None)
            self.ms_tts = True
        self.__connection = None
        self.__history_data = []

    def __get_history(self, voice_name, style, text):
        for data in self.__history_data:
            if data[0] == voice_name and data[1] == style and data[2] == text:
                return data[3]
        return None

    def connect(self):
        if self.ms_tts:
            self.__connection = speechsdk.Connection.from_speech_synthesizer(self.__synthesizer)
            self.__connection.open(True)
        util.log(1, "TTS 服务已经连接！")

    def close(self):
        if self.__connection is not None:
            self.__connection.close()

    async def get_edge_tts(self, text, voice, file_url) -> None:
        communicate = edge_tts.Communicate(text, voice)
        await communicate.save(file_url)

    def convert_mp3_to_wav(self, mp3_filepath):
        """Optional MP3→WAV conversion. Requires pydub + ffmpeg."""
        if not HAS_PYDUB:
            util.log(1, "[!] pydub not installed, skipping MP3→WAV conversion (frontend handles it)")
            return mp3_filepath
        try:
            audio = AudioSegment.from_mp3(mp3_filepath)
            audio = audio.set_frame_rate(44100)
            wav_filepath = mp3_filepath.rsplit(".", 1)[0] + ".wav"
            audio.export(wav_filepath, format="wav")
            return wav_filepath
        except Exception as e:
            util.log(1, f"[!] MP3→WAV conversion failed (ffmpeg may be missing): {e}")
            util.log(1, "[!] Returning MP3 directly — frontend handles WAV conversion")
            return mp3_filepath

    def to_sample(self, text, style):
        """Text-to-speech. Returns audio file path (MP3 or WAV)."""
        if self.ms_tts:
            # Azure Speech SDK path
            voice_type = tts_voice.get_voice_of(config_util.config["attribute"]["voice"] if config_util.config["attribute"]["voice"] is not None and config_util.config["attribute"]["voice"].strip() != "" else "晓晓(edge)")
            voice_name = EnumVoice.XIAO_XIAO.value["voiceName"]
            if voice_type is not None:
                voice_name = voice_type.value["voiceName"]
            history = self.__get_history(voice_name, style, text)
            if history is not None:
                return history
            ssml = '<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xmlns:mstts="https://www.w3.org/2001/mstts" xml:lang="zh-CN">' \
                   '<voice name="{}">' \
                   '<mstts:express-as style="{}" styledegree="{}">' \
                   '{}' \
                   '</mstts:express-as>' \
                   '</voice>' \
                   '</speak>'.format(voice_name, style, 1.8, "<break time='0.2s'/>" + text)
            result = self.__synthesizer.speak_text_async(text).get()
            audio_data_stream = speechsdk.AudioDataStream(result)
            file_url = './samples/sample-' + str(int(time.time() * 1000)) + '.wav'
            audio_data_stream.save_to_wav_file(file_url)
            if result.reason == speechsdk.ResultReason.SynthesizingAudioCompleted:
                self.__history_data.append((voice_name, style, text, file_url))
                return file_url
            else:
                util.log(1, "[x] 语音转换失败！")
                util.log(1, "[x] 原因: " + str(result.reason))
                return None
        else:
            # Edge TTS (free, browser-based) — primary TTS engine
            voice_type = tts_voice.get_voice_of(config_util.config["attribute"]["voice"])
            voice_name = EnumVoice.XIAO_XIAO.value["voiceName"]
            if voice_type is not None:
                voice_name = voice_type.value["voiceName"]
            history = self.__get_history(voice_name, style, text)
            if history is not None:
                return history

            try:
                file_url = './samples/sample-' + str(int(time.time() * 1000)) + '.mp3'

                # Use the existing event loop if available (FastAPI), otherwise create one
                try:
                    loop = asyncio.get_running_loop()
                    # Running inside an event loop → create task in a new thread
                    import concurrent.futures
                    def _run():
                        new_loop = asyncio.new_event_loop()
                        asyncio.set_event_loop(new_loop)
                        new_loop.run_until_complete(self.get_edge_tts(text, voice_name, file_url))
                        new_loop.close()
                    with concurrent.futures.ThreadPoolExecutor() as executor:
                        executor.submit(_run).result(timeout=30)
                except RuntimeError:
                    # No running event loop → create one
                    asyncio.new_event_loop().run_until_complete(self.get_edge_tts(text, voice_name, file_url))

                # Convert to WAV if pydub+ffmpeg available, otherwise keep MP3
                # (Frontend handles MP3→WAV via Web Audio API)
                wav_url = self.convert_mp3_to_wav(file_url)
                self.__history_data.append((voice_name, style, text, wav_url))
                return wav_url
            except Exception as e:
                util.log(1, "[x] Edge TTS 语音转换失败！")
                util.log(1, "[x] 异常: " + str(e))
                return None

if __name__ == '__main__':
    cfg.load_config()
    sp = Speech()
    sp.connect()
    text = "我叫Fay,我今年18岁，很年青。"
    s = sp.to_sample(text, "cheerful")
    print(s)
    sp.close()

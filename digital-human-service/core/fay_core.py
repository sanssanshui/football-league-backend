# -*- coding: utf-8 -*-


#作用是处理交互逻辑，文字输入，语音、文字及情绪的发送、播放及展示输出


import math


from operator import index


import os


import time


import socket


import requests


from pydub import AudioSegment


from queue import Queue


import re  # 添加正则表达式模块用于过滤表情符号


import uuid





# 适应模型使用


import numpy as np


from ai_module import baidu_emotion


from core import wsa_server


from core.interact import Interact


from tts.tts_voice import EnumVoice


from scheduler.thread_manager import MyThread


from tts import tts_voice


from utils import util, config_util


from core import qa_service


from utils import config_util as cfg


from core import content_db


from ai_module import nlp_cemotion


from core import stream_manager





from core import member_db


import threading





#加载配置


cfg.load_config()


if cfg.tts_module =='ali':


    from tts.ali_tss import Speech


elif cfg.tts_module == 'gptsovits':


    from tts.gptsovits import Speech


elif cfg.tts_module == 'gptsovits_v3':


    from tts.gptsovits_v3 import Speech    


elif cfg.tts_module == 'volcano':


    from tts.volcano_tts import Speech


else:


    from tts.ms_tts_sdk import Speech





#windows运行推送唇形数据


import platform

LipSyncGenerator = None

if platform.system() == "Windows":
    try:
        import sys
        sys.path.append("test/ovr_lipsync")
        from test_olipsync import LipSyncGenerator as _LipSync
        LipSyncGenerator = _LipSync
    except (ImportError, ModuleNotFoundError):
        pass  # Lip sync not available in headless mode


    





#可以使用自动播报的标记


can_auto_play = True


auto_play_lock = threading.RLock()


# ========== 肢体动作关键词映射配置 ==========
# 动作编号说明（Natori模型，共8个motion）：
#   MotionNo = 0 表示无匹配，不触发特殊动作（使用idle循环）
#   MotionNo = 1 (mtn_03): 打开怀表动作 - 思考/沉思/看时间
#   MotionNo = 2 (mtn_04): 扶眼镜+手臂动作 - 详细解释/强调说明
#   MotionNo = 3 (mtn_05): 手臂手势+双眨眼 - 开心/同意/庆祝
#   MotionNo = 4 (mtn_06): 身体大幅度倾斜 - 惊讶/兴奋/震惊
#   MotionNo = 5 (mtn_07): 耸肩动作 - 困惑/不确定/不知道
#   MotionNo = 6 (mtn_01): 头部倾斜+手臂姿态 - 问候/欢迎/点头
#   MotionNo = 7 (mtn_02): 身体摇摆+手臂姿态 - 正常讲解/说话

KEYWORD_MOTION_MAP = {
    # ========== 问候/欢迎类 → 动作6：头部倾斜+手臂姿态 ==========
    "你好|您好|欢迎|hello|hi|哈喽|嘿|嗨": 6,
    "你好呀|嗨|hello there|你好嘛|大家好|各位好": 6,
    "早|早上好|上午好|下午好|晚上好": 6,
    "欢迎光临|欢迎回来|欢迎欢迎": 6,
    "欢迎欢迎|热烈欢迎": 6,

    # ========== 告别类 → 动作5：耸肩(道别也适用) ==========
    "再见|拜拜|bye|再见啦|goodbye|byebye": 5,
    "走了|离开了|先走了|下次见": 5,
    "晚安|早上见|明天见": 5,

    # ========== 肯定/认同类 → 动作3：手臂手势+双眨眼(开心同意) ==========
    "是的|对|正确|好的|嗯|没错|当然|是的呀": 3,
    "没问题|收到|明白了|OK|ok|ok了|了解": 3,
    "就是|正是|确实|必须|绝对是": 3,
    "有道理|说得对|你说得对|认同": 3,
    "我懂了|我明白了|我理解了|原来如此": 3,
    "懂了|了解了|知道了|清楚": 3,
    "哦|噢|原来是这样|怪不得": 3,
    "我懂|明白|了解|清楚啦": 3,
    "好的|行|可以|同意|同意的|就这么办": 3,
    "好的呢|可以呀|没问题哒|好哒": 3,

    # ========== 否定/拒绝类 → 动作5：耸肩(不同意/无奈) ==========
    "不是|不对|错误|不|没有|no|nono": 5,
    "不行|不可以|不能|别|不要|no way": 5,
    "不是的|不对呀|没有呀|怎么会": 5,
    "不行呀|不可以呀|不能呢": 5,
    "未必|不一定|不见得|不太好说": 5,

    # ========== 思考/沉思类 → 动作1：打开怀表(思考动作) ==========
    "让我想想|思考一下|想一想|考虑|想想|我想想": 1,
    "嗯...|嗯嗯|这个嘛|怎么说呢|怎么说": 1,
    "考虑一下|考虑考虑|需要想想": 1,
    "等一下|稍等|wait|稍后|等会|等等": 1,
    "稍等一下|等一会儿|马上|稍等片刻": 1,
    "请稍等|请稍候|请稍等一下": 1,

    # ========== 困惑/不确定类 → 动作5：耸肩 ==========
    "我不知道|我不清楚|不确定|不太清楚|不太确定": 5,
    "什么？|怎么|为什么|咋|为啥": 5,
    "啊？|嗯？|什么？|咋了": 5,
    "为什么|为何|怎么|咋样|怎么样": 5,
    "真的吗|是吗|真的假的|你说呢": 5,
    "怎么回事|怎么了|发生什么了": 5,

    # ========== 道歉类 → 动作5：耸肩(诚恳) ==========
    "抱歉|对不起|不好意思|请原谅|道歉": 5,
    "对不起啦|抱歉啦|不好意思啦|对不起哦": 5,
    "是我的错|我错了|怪我|都怪我": 5,
    "别生气|别介意|别放在心上": 5,

    # ========== 惊讶/震惊类 → 动作4：身体大幅度倾斜 ==========
    "哇|天啊|真的吗|什么|竟然|居然": 4,
    "不会吧|天哪|我的天|真的假的": 4,
    "什么？|啊？|真的？|天啊！": 4,
    "天哪|my god|omg|我的妈呀": 4,
    "难以置信|不敢相信|怎么会这样": 4,

    # ========== 胜利/庆祝/开心类 → 动作3：手臂手势+眨眼 ==========
    "成功|完成|做到了|太棒了|厉害|赢了": 3,
    "耶|万岁|太好了|棒极了|优秀|太赞了": 3,
    "不错|挺好|还可以|蛮好|不赖": 3,
    "好耶|太棒啦|成功啦|做到了耶": 3,
    "完美|绝妙|精彩|太完美了|满分": 3,
    "激动|兴奋|开心死了|高兴死了": 3,
    "厉害|牛|强|佩服|太厉害了": 3,
    "优秀|出色|卓越|了不起|太牛了": 3,
    "真厉害|真牛|真棒|真强": 3,
    "佩服|佩服佩服|五体投地": 3,
    "喜欢|爱|热爱|最爱|很爱": 3,
    "好喜欢|超级喜欢|特别喜欢|最爱了": 3,
    "我很喜欢|我挺喜欢|我爱": 3,

    # ========== 沮丧/失望类 → 动作5：耸肩(无奈/沮丧) ==========
    "唉|糟糕|完蛋|不行|失败": 5,
    "难过|伤心|失落|遗憾|可惜": 5,
    "真遗憾|太可惜了|好可惜呀": 5,
    "好难过|好伤心|好失落|唉...": 5,
    "失败|输了|搞砸了|弄砸了": 5,

    # ========== 解释/说明类 → 动作2：扶眼镜+手臂动作 ==========
    "也就是说|换句话说|意思是|即": 2,
    "简单说|简单来说|简单点|简单来说就是": 2,
    "其实|实际上|事实上|其实呢": 2,
    "具体来说|具体点|详细说": 2,
    "举个例子|比如|例如|比方说": 2,
    "建议|推荐|你可以试试|试试看": 2,
    "最好|应该|可以试试|我建议": 2,
    "试一试|试试吧|可以试试看": 2,
    "推荐你|推荐一下|我觉得你可以": 2,

    # ========== 邀请/欢迎类 → 动作6：头部倾斜+手臂姿态 ==========
    "请|请进|进来|欢迎光临|快请进": 6,
    "来吧|一起来|跟我来|这边请|请坐": 6,
    "快进来|进来坐|请进请进": 6,
    "麻烦|劳驾|拜托|请": 6,
    "帮帮我|帮我|帮帮忙": 6,

    # ========== 警告/提醒类 → 动作2：扶眼镜(郑重说明) ==========
    "注意|小心|提醒|警告|要注意": 2,
    "小心点|注意安全|要小心|警告你": 2,
    "别忘了|记得|千万不要|一定要注意": 2,

    # ========== 总结/结束类 → 动作7：身体摇摆(常规讲解) ==========
    "总之|总的来说|总之就是|简而言之": 7,
    "所以|因此|综上": 7,
    "就这样|就是这样|结束|完了": 7,
    "最后|最后一点|最后想说": 7,

    # ========== 感谢类 → 动作6：头部倾斜(感谢姿态) ==========
    "谢谢|感谢|多谢|Thank|感谢你|谢谢你": 6,
    "非常感谢|万分感谢|太感谢了|谢啦": 6,
    "谢谢啦|感谢啦|多谢啦|谢了": 6,
    "感激不尽|不胜感激|太感激了": 6,

    # ========== 承诺/保证类 → 动作3：点头同意 ==========
    "一定|肯定|绝对|保证|放心吧": 3,
    "我保证|我承诺|一定会的": 3,
    "放心|不用担心|别担心": 3,

    # ========== 关心/安慰类 → 动作7：正常说话姿态 ==========
    "怎么了|发生什么|还好吗|没事吧": 7,
    "你还好吧|你怎么样|还好吗": 7,
    "别担心|没事|不要紧|放心": 7,

    # ========== 其他常用回应 → 动作7：正常说话 ==========
    "嗯|哦|啊|是吗": 7,
    "哈哈|嘿嘿|嘻嘻|呵呵": 3,
    "嗯哼|嗯嗯|好哒|好的呀": 3,
    "提醒你|告诉你|跟你说": 7,
    "拜托啦|求你了|麻烦你了": 6,
}


def generate_simple_lipsync(audio_file_path: str, text: str = "") -> list:
    """
    Fallback lip-sync generator when OVR Lipsync is not available.
    Generates basic mouth open/close viseme patterns based on audio duration.
    Returns list of {Lip: str, Time: float} dicts.
    """
    try:
        from pydub import AudioSegment
        audio = None
        ext = os.path.splitext(audio_file_path)[1].lower()
        if ext == '.wav':
            audio = AudioSegment.from_wav(audio_file_path)
        elif ext == '.mp3':
            audio = AudioSegment.from_mp3(audio_file_path)
        if audio is None:
            return _generate_text_based_lipsync(text)
        duration_ms = len(audio)
        return _generate_viseme_pattern(duration_ms, text)
    except Exception:
        return _generate_text_based_lipsync(text)


def _generate_viseme_pattern(duration_ms: float, text: str = "") -> list:
    """Generate a natural talking viseme pattern using OVR-compatible viseme names.
    Viseme names must match the Vite bundle's LipSync.visemeMap:
    'aa'=0.9(wide open), 'ou'=0.8(rounded), 'oh'=0.7(round),
    'E'=0.6(slight), 'DD'=0.5, 'TH'=0.4, 'FF'=0.3, 'PP'=0.2, 'sil'=0.0(closed)
    """
    visemes = []
    elapsed = 0.0
    # Natural talking rhythm: open wide → medium → rest → repeat
    talking_pattern = [
        ("aa", 100.0),   # wide open
        ("ih", 60.0),    # half close
        ("oh", 80.0),    # rounded open
        ("E", 60.0),     # slight open
        ("aa", 90.0),    # wide open again
        ("sil", 50.0),   # brief close
        ("ou", 80.0),    # rounded protruding
        ("E", 70.0),     # medium
    ]

    while elapsed < duration_ms:
        for lip, time_ms in talking_pattern:
            if elapsed >= duration_ms:
                break
            # Add slight randomness to time for natural variation
            import random
            jitter = random.uniform(-15, 15)
            adjusted_time = max(30, time_ms + jitter)
            visemes.append({"Lip": lip, "Time": adjusted_time})
            elapsed += adjusted_time

    return visemes


def _generate_text_based_lipsync(text: str) -> list:
    """Generate simple lip-sync from text (when audio unavailable)."""
    if not text:
        return []
    visemes = []
    # Estimate: ~4 chars per second for Chinese TTS
    char_rate = 4.0
    duration_ms = max(len(text) / char_rate * 1000, 500)
    return _generate_viseme_pattern(duration_ms, text)


def analyze_motion_by_keywords(text: str) -> int:
    """
    根据关键词分析文本对应的动作编号（Natori模型7个动作）

    Args:
        text: 输入文本

    Returns:
        int: 动作编号（0表示无匹配，1-7对应Natori的TapBody motion:
             1=思考(怀表), 2=解释(扶眼镜), 3=开心(手势+眨眼),
             4=惊讶(身体倾斜), 5=困惑/否定(耸肩), 6=问候(头部倾斜),
             7=常规讲解(身体摇摆)）
    """
    if not text:
        return 0

    text_lower = text.lower()

    # 遍历关键词映射表
    for keywords, motion_no in KEYWORD_MOTION_MAP.items():
        keyword_list = keywords.split('|')
        for keyword in keyword_list:
            if keyword.lower() in text_lower:
                util.printInfo(1, "MotionAnalyzer", f"关键词 '{keyword}' 匹配 → 动作 {motion_no}")
                return motion_no

    return 0  # 没有匹配的关键词





class FeiFei:


    def __init__(self):


        self.lock = threading.Lock()


        self.nlp_streams = {} # 存储用户ID到句子缓存的映射


        self.nlp_stream_lock = threading.Lock() # 保护nlp_streams字典的锁


        self.mood = 0.0  # 情绪值


        self.old_mood = 0.0


        self.item_index = 0


        self.X = np.array([1, 0, 0, 0, 0, 0, 0, 0]).reshape(1, -1)  # 适应模型变量矩阵


        # self.W = np.array([0.01577594,1.16119452,0.75828,0.207746,1.25017864,0.1044121,0.4294899,0.2770932]).reshape(-1,1) #适应模型变量矩阵


        self.W = np.array([0.0, 0.6, 0.1, 0.7, 0.3, 0.0, 0.0, 0.0]).reshape(-1, 1)  # 适应模型变量矩阵





        self.wsParam = None


        self.wss = None


        self.sp = Speech()


        self.speaking = False #声音是否在播放


        self.__running = True


        self.sp.connect()  #TODO 预连接





        self.timer = None


        self.sound_query = Queue()


        self.think_mode_users = {}  # 使用字典存储每个用户的think模式状态


        self.think_time_users = {} #使用字典存储每个用户的think开始时间
        self.think_display_state = {}
        self.think_display_limit = 400
        self.user_conv_map = {} #存储用户对话id及句子流序号，key为(username, conversation_id)

        self.pending_isfirst = {}  # 存储因prestart被过滤而延迟的isfirst标记，key为username

    


    def __remove_emojis(self, text):


        """


        改进的表情包过滤，避免误删除正常Unicode字符


        """


        # 更精确的emoji范围，避免误删除正常字符


        emoji_pattern = re.compile(


            "["


            "\U0001F600-\U0001F64F"  # 表情符号 (Emoticons)


            "\U0001F300-\U0001F5FF"  # 杂项符号和象形文字 (Miscellaneous Symbols and Pictographs)


            "\U0001F680-\U0001F6FF"  # 交通和地图符号 (Transport and Map Symbols)


            "\U0001F1E0-\U0001F1FF"  # 区域指示符号 (Regional Indicator Symbols)


            "\U0001F900-\U0001F9FF"  # 补充符号和象形文字 (Supplemental Symbols and Pictographs)


            "\U0001FA70-\U0001FAFF"  # 扩展A符号和象形文字 (Symbols and Pictographs Extended-A)


            "\U00002600-\U000026FF"  # 杂项符号 (Miscellaneous Symbols)


            "\U00002700-\U000027BF"  # 装饰符号 (Dingbats)


            "\U0000FE00-\U0000FE0F"  # 变体选择器 (Variation Selectors)


            "\U0001F000-\U0001F02F"  # 麻将牌 (Mahjong Tiles)


            "\U0001F0A0-\U0001F0FF"  # 扑克牌 (Playing Cards)


            "]+",


            flags=re.UNICODE,


        )





        # 保护常用的中文标点符号和特殊字符


        protected_chars = ["。", "，", "！", "？", "：", "；", "、", """, """, "'", "'", "（", "）", "【", "】", "《", "》"]





        # 先保存保护字符的位置


        protected_positions = {}


        for i, char in enumerate(text):


            if char in protected_chars:


                protected_positions[i] = char





        # 执行emoji过滤


        filtered_text = emoji_pattern.sub('', text)





        # 如果过滤后文本长度变化太大，可能误删了正常字符，返回原文本


        if len(filtered_text) < len(text) * 0.5:  # 如果删除了超过50%的内容


            return text





        return filtered_text





    def __process_stream_output(self, text, username, session_type="type2_stream", is_qa=False):


        """


        按流式方式分割和发送 type=2 的文本


        使用安全的流式文本处理器和状态管理器


        """


        if not text or text.strip() == "":


            return





        # 使用安全的流式文本处理器


        from utils.stream_text_processor import get_processor


        from utils.stream_state_manager import get_state_manager





        processor = get_processor()


        state_manager = get_state_manager()





        # 处理流式文本，is_qa=False表示普通模式


        success = processor.process_stream_text(text, username, is_qa=is_qa, session_type=session_type)





        if success:


            # 普通模式结束会话


            state_manager.end_session(username, conversation_id=stream_manager.new_instance().get_conversation_id(username))


        else:


            util.log(1, f"type=2流式处理失败，文本长度: {len(text)}")


            # 失败时也要确保结束会话


            state_manager.force_reset_user_state(username)





    #语音消息处理检查是否命中q&a


    def __get_answer(self, interleaver, text):
        # Always return None to use LLM for all responses.
        # QA shortcut is disabled for better contextual answers.
        # Only intercept persona questions (name, age, etc.)
        answer, ptype = qa_service.QAService().question('Persona', text)
        if answer is not None:
            return answer, ptype
        return None, None


        


       


    #消息处理


    def __process_interact(self, interact: Interact):


        if self.__running:


            try:


                index = interact.interact_type


                username = interact.data.get("user", "User")


                uid = member_db.new_instance().find_user(username)
                no_reply = interact.data.get("no_reply", False)
                if isinstance(no_reply, str):
                    no_reply = no_reply.strip().lower() in ("1", "true", "yes", "y", "on")
                else:
                    no_reply = bool(no_reply)


                


                if index == 1: #语音、文字交互


                    


                    #记录用户问题,方便obs等调用


                    self.write_to_file("./logs", "asr_result.txt",  interact.data["msg"])





                    #同步用户问题到数字人


                    if wsa_server.get_instance().is_connected(username): 


                        content = {'Topic': 'human', 'Data': {'Key': 'question', 'Value': interact.data["msg"]}, 'Username' : interact.data.get("user")}


                        wsa_server.get_instance().add_cmd(content)





                    #记录用户问题


                    if not no_reply:
                        content_id = content_db.new_instance().add_content('member','speak',interact.data["msg"], username, uid)
                        if wsa_server.get_web_instance().is_connected(username):
                            wsa_server.get_web_instance().add_cmd({"panelReply": {"type":"member","content":interact.data["msg"], "username":username, "uid":uid, "id":content_id}, "Username" : username})


                    


                    observation = interact.data.get("observation", None)
                    obs_text = ""
                    if observation is not None:
                        obs_text = observation.strip() if isinstance(observation, str) else str(observation).strip()
                    if not obs_text and no_reply:
                        msg_text = interact.data.get("msg", "")
                        obs_text = msg_text.strip() if isinstance(msg_text, str) else str(msg_text).strip()
                    if obs_text:
                        from llm import nlp_cognitive_stream
                        nlp_cognitive_stream.record_observation(username, obs_text)
                    if no_reply:
                        return ""

                    #确定是否命中q&a


                    answer, type = self.__get_answer(interact.interleaver, interact.data["msg"])


                    


                    #大语言模型回复    


                    text = ''


                    if answer is None or type != "qa":


                        if wsa_server.get_web_instance().is_connected(username):


                            wsa_server.get_web_instance().add_cmd({"panelMsg": "思考中...", "Username" : username, 'robot': f'{cfg.fay_url}/robot/Thinking.jpg'})


                        if wsa_server.get_instance().is_connected(username):


                            content = {'Topic': 'human', 'Data': {'Key': 'log', 'Value': "思考中..."}, 'Username' : username, 'robot': f'{cfg.fay_url}/robot/Thinking.jpg'}


                            wsa_server.get_instance().add_cmd(content)





                        # 根据配置动态调用不同的NLP模块


                        if cfg.config["memory"].get("use_bionic_memory", False):


                            from llm import nlp_bionicmemory_stream


                            text = nlp_bionicmemory_stream.question(interact.data["msg"], username, interact.data.get("observation", None))


                        else:


                            from llm import nlp_cognitive_stream


                            text = nlp_cognitive_stream.question(interact.data["msg"], username, interact.data.get("observation", None))





                    else: 


                        text = answer


                        # 使用流式分割处理Q&A答案


                        self.__process_stream_output(text, username, session_type="qa", is_qa=True)


                           





                    return text      


                


                elif (index == 2):#透传模式：有音频则仅播音频；仅文本则流式+TTS


                    audio_url = interact.data.get("audio")


                    text = interact.data.get("text")





                    # 1) 存在音频：忽略文本，仅播放音频


                    if audio_url and str(audio_url).strip():


                        try:


                            audio_interact = Interact(


                                "stream", 1,


                                {"user": username, "msg": "", "isfirst": True, "isend": True, "audio": audio_url}


                            )


                            self.say(audio_interact, "")


                        except Exception:


                            pass


                        return 'success'





                    # 2) 只有文本：执行流式切分并TTS


                    if text and str(text).strip():


                        # 进行流式处理（用于TTS，流式处理中会记录到数据库）


                        self.__process_stream_output(text, username, f"type2_{interact.interleaver}", is_qa=False)


                        


                        # 不再需要额外记录，因为流式处理已经记录了


                        # self.__process_text_output(text, username, uid)


                        


                        return 'success'





                    # 没有有效内容


                    return 'success'


   


            except BaseException as e:


                print(e)


                return e


        else:


            return "还没有开始运行"





    #记录问答到log


    def write_to_file(self, path, filename, content):


        if not os.path.exists(path):


            os.makedirs(path)


        full_path = os.path.join(path, filename)


        with open(full_path, 'w', encoding='utf-8') as file:


            file.write(content)


            file.flush()  


            os.fsync(file.fileno()) 





    #触发交互


    def on_interact(self, interact: Interact):


        #创建用户


        username = interact.data.get("user", "User")


        if member_db.new_instance().is_username_exist(username)  == "notexists":


            member_db.new_instance().add_user(username)


        no_reply = interact.data.get("no_reply", False)

        if isinstance(no_reply, str):

            no_reply = no_reply.strip().lower() in ("1", "true", "yes", "y", "on")

        else:

            no_reply = bool(no_reply)



        if not no_reply:

            try:


                from utils.stream_state_manager import get_state_manager


                import uuid


                if get_state_manager().is_session_active(username):


                    stream_manager.new_instance().clear_Stream_with_audio(username)


                conv_id = "conv_" + str(uuid.uuid4())


                stream_manager.new_instance().set_current_conversation(username, conv_id)


                # 将当前会话ID附加到交互数据


                interact.data["conversation_id"] = conv_id


                # 允许新的生成


                stream_manager.new_instance().set_stop_generation(username, stop=False)


            except Exception:


                util.log(3, "开启新会话失败")





        if interact.interact_type == 1:


            MyThread(target=self.__process_interact, args=[interact]).start()


        else:


            return self.__process_interact(interact)





    #获取不同情绪声音
    def __get_mood_voice(self, sentiment=0):
        """根据情感值返回对应的TTS语音风格
        sentiment: -2~+2 的情感值（负数消极，正数积极）
        """
        voice = tts_voice.get_voice_of(config_util.config["attribute"]["voice"])
        if voice is None:
            voice = EnumVoice.XIAO_XIAO

        styleList = voice.value["styleList"]

        # 情感值 → TTS风格映射
        if sentiment >= 1.5:
            # 非常积极：兴奋/欢呼风格
            sayType = styleList.get("cheerful", styleList.get("calm", "gentle"))
        elif sentiment >= 0.5:
            # 积极：开心风格
            sayType = styleList.get("cheerful", styleList.get("calm", "gentle"))
        elif sentiment <= -1.5:
            # 非常消极：愤怒或严肃
            sayType = styleList.get("angry", styleList.get("calm", "gentle"))
        elif sentiment <= -0.5:
            # 消极/疑惑：抒情/柔和风格
            sayType = styleList.get("lyrical", styleList.get("calm", "gentle"))
        else:
            # 中性：默认calm
            sayType = styleList.get("calm", "gentle")

        return sayType





    # 合成声音


    def say(self, interact, text, type = ""):


        try:


            uid = member_db.new_instance().find_user(interact.data.get("user"))


            is_end = interact.data.get("isend", False)


            is_first = interact.data.get("isfirst", False)


            username = interact.data.get("user", "User")


            


            # 提前进行会话有效性与中断检查，避免产生多余面板/数字人输出


            try:


                user_for_stop = interact.data.get("user", "User")


                conv_id_for_stop = interact.data.get("conversation_id")


                if not is_end and stream_manager.new_instance().should_stop_generation(user_for_stop, conversation_id=conv_id_for_stop):


                    return None


            except Exception:


                pass


            


            #无效流式文本提前结束


            if not is_first and not is_end and (text is None or text.strip() == ""):


                return None


                


            # 检查是否是 prestart 内容（不应该影响 thinking 状态）


            is_prestart_content = self.__has_prestart(text)




            # 流式文本拼接存库


            content_id = 0


            # 使用 (username, conversation_id) 作为 key，避免并发会话覆盖


            conv = interact.data.get("conversation_id") or ""


            conv_map_key = (username, conv)





            if is_first == True:


                # reset any leftover think-mode at the start of a new reply


                # 但如果是 prestart 内容，不重置 thinking 状态


                try:


                    if uid is not None and not is_prestart_content:


                        self.think_mode_users[uid] = False


                        if uid in self.think_time_users:


                            del self.think_time_users[uid]
                        if uid in self.think_display_state:
                            del self.think_display_state[uid]


                except Exception:


                    pass


                # 如果没有 conversation_id，生成一个新的


                if not conv:


                    conv = "conv_" + str(uuid.uuid4())


                    conv_map_key = (username, conv)


                conv_no = 0


                # 创建第一条数据库记录，获得content_id


                if text and text.strip():


                    content_id = content_db.new_instance().add_content('fay', 'speak', text, username, uid)


                else:


                    content_id = content_db.new_instance().add_content('fay', 'speak', '', username, uid)





                # 保存content_id到会话映射中，使用 (username, conversation_id) 作为 key


                self.user_conv_map[conv_map_key] = {


                    "conversation_id": conv,


                    "conversation_msg_no": conv_no,


                    "content_id": content_id


                }


                util.log(1, f"流式会话开始: key={conv_map_key}, content_id={content_id}")


            else:


                # 获取之前保存的content_id


                conv_info = self.user_conv_map.get(conv_map_key, {})


                content_id = conv_info.get("content_id", 0)





                # 如果 conv_map_key 不存在，尝试使用 username 作为备用查找


                if not conv_info and text and text.strip():


                    # 查找所有匹配用户名的会话


                    for (u, c), info in list(self.user_conv_map.items()):


                        if u == username and info.get("content_id", 0) > 0:


                            content_id = info.get("content_id", 0)


                            conv_info = info


                            util.log(1, f"警告：使用备用会话 ({u}, {c}) 的 content_id={content_id}，原 key=({username}, {conv})")


                            break





                if conv_info:


                    conv_info["conversation_msg_no"] = conv_info.get("conversation_msg_no", 0) + 1





                # 如果有新内容，更新数据库


                if content_id > 0 and text and text.strip():


                    # 获取当前已有内容


                    existing_content = content_db.new_instance().get_content_by_id(content_id)


                    if existing_content:


                        # 累积内容


                        accumulated_text = existing_content[3] + text


                        content_db.new_instance().update_content(content_id, accumulated_text)


                elif content_id == 0 and text and text.strip():


                    # content_id 为 0 表示可能会话 key 不匹配，记录警告


                    util.log(1, f"警告：content_id=0，无法更新数据库。user={username}, conv={conv}, text片段={text[:50] if len(text) > 50 else text}")





            # 会话结束时清理 user_conv_map 中的对应条目，避免内存泄漏


            if is_end and conv_map_key in self.user_conv_map:


                del self.user_conv_map[conv_map_key]





            # 推送给前端和数字人


            try:


                user_for_stop = interact.data.get("user", "User")


                conv_id_for_stop = interact.data.get("conversation_id")


                if is_end or not stream_manager.new_instance().should_stop_generation(user_for_stop, conversation_id=conv_id_for_stop):


                    self.__process_text_output(text, interact.data.get('user'), uid, content_id, type, is_first, is_end)


            except Exception:


                self.__process_text_output(text, interact.data.get('user'), uid, content_id, type, is_first, is_end)


            


            # 处理think标签


            # 第一步：处理结束标记</think>


            if "</think>" in text:


                # 设置用户退出思考模式


                self.think_mode_users[uid] = False


                


                # 分割文本，提取</think>后面的内容


                # 如果有多个</think>，我们只关心最后一个后面的内容


                parts = text.split("</think>")


                text = parts[-1].strip()


                


                # 如果提取出的文本为空，则不需要继续处理


                if text == "":


                    return None


            # 第二步：处理开始标记<think>


            # 注意：这里要检查经过上面处理后的text


            if "<think>" in text:


                self.think_mode_users[uid] = True


                self.think_time_users[uid] = time.time()


   


            #”思考中“的输出


            if self.think_mode_users.get(uid, False):


                try:


                    user_for_stop = interact.data.get("user", "User")


                    conv_id_for_stop = interact.data.get("conversation_id")


                    should_block = stream_manager.new_instance().should_stop_generation(user_for_stop, conversation_id=conv_id_for_stop)


                except Exception:


                    should_block = False


                if not should_block:


                    if wsa_server.get_web_instance().is_connected(interact.data.get('user')):


                        wsa_server.get_web_instance().add_cmd({"panelMsg": "思考中...", "Username" : interact.data.get('user'), 'robot': f'{cfg.fay_url}/robot/Thinking.jpg'})


                    if wsa_server.get_instance().is_connected(interact.data.get("user")):


                        content = {'Topic': 'human', 'Data': {'Key': 'log', 'Value': "思考中..."}, 'Username' : interact.data.get('user'), 'robot': f'{cfg.fay_url}/robot/Thinking.jpg'}


                        wsa_server.get_instance().add_cmd(content)





            #”请稍等“的音频输出（不影响文本输出）


            if self.think_mode_users.get(uid, False) == True and time.time() - self.think_time_users[uid] >= 5:


                self.think_time_users[uid] = time.time()


                text = "请稍等..."


            elif self.think_mode_users.get(uid, False) == True and "</think>" not in text:


                return None


            


            result = None


            audio_url = interact.data.get('audio', None)#透传的音频





            # 移除 prestart 标签内容，不进行TTS


            tts_text = self.__remove_prestart_tags(text) if text else text





            if audio_url is not None:#透传音频下载


                file_name = 'sample-' + str(int(time.time() * 1000)) + audio_url[-4:]


                result = self.download_wav(audio_url, './samples/', file_name)


            elif config_util.config["interact"]["playSound"] or wsa_server.get_instance().get_client_output(interact.data.get("user")) or self.__is_send_remote_device_audio(interact):#tts


                if tts_text != None and tts_text.replace("*", "").strip() != "":


                    # 检查是否需要停止TTS处理（按会话）


                    if stream_manager.new_instance().should_stop_generation(


                        interact.data.get("user", "User"),


                        conversation_id=interact.data.get("conversation_id")


                    ):


                        util.printInfo(1, interact.data.get('user'), 'TTS处理被打断，跳过音频合成')


                        return None





                    # 先过滤表情符号，然后再合成语音


                    filtered_text = self.__remove_emojis(tts_text.replace("*", ""))


                    if filtered_text is not None and filtered_text.strip() != "":


                        util.printInfo(1,  interact.data.get('user'), '合成音频...')

                        tm = time.time()

                        # 预分析情感，用于选择TTS语音风格
                        pre_sentiment = self.__analyze_sentiment_by_keywords(filtered_text)
                        result = self.sp.to_sample(filtered_text, self.__get_mood_voice(pre_sentiment))


                        # 合成完成后再次检查会话是否仍有效，避免继续输出旧会话结果


                        try:


                            user_for_stop = interact.data.get("user", "User")


                            conv_id_for_stop = interact.data.get("conversation_id")


                            if stream_manager.new_instance().should_stop_generation(user_for_stop, conversation_id=conv_id_for_stop):


                                return None


                        except Exception:


                            pass


                        util.printInfo(1,  interact.data.get("user"), "合成音频完成. 耗时: {} ms 文件:{}".format(math.floor((time.time() - tm) * 1000), result))


            else:


                # prestart 内容不应该触发机器人表情重置


                if is_end and not is_prestart_content and wsa_server.get_web_instance().is_connected(interact.data.get('user')):


                    wsa_server.get_web_instance().add_cmd({"panelMsg": "", 'Username' : interact.data.get('user'), 'robot': f'{cfg.fay_url}/robot/Normal.jpg'})





            if result is not None or is_first or is_end:


                # prestart 内容不需要进入音频处理流程


                if is_prestart_content:


                    return result


                if is_end:#TODO 临时方案：如果结束标记，则延迟1秒处理,免得is end比前面的音频tts要快


                    time.sleep(1)


                MyThread(target=self.__process_output_audio, args=[result, interact, text]).start()


                return result         


                


        except BaseException as e:


            print(e) 


        return None


    


    #下载wav


    def download_wav(self, url, save_directory, filename):


        try:


            # 发送HTTP GET请求以获取WAV文件内容


            response = requests.get(url, stream=True)


            response.raise_for_status()  # 检查请求是否成功





            # 确保保存目录存在


            if not os.path.exists(save_directory):


                os.makedirs(save_directory)





            # 构建保存文件的路径


            save_path = os.path.join(save_directory, filename)





            # 将WAV文件内容保存到指定文件


            with open(save_path, 'wb') as f:


                for chunk in response.iter_content(chunk_size=1024):


                    if chunk:


                        f.write(chunk)





            return save_path


        except requests.exceptions.RequestException as e:


            print(f"[Error] Failed to download file: {e}")


            return None








    #面板播放声音


    def __play_sound(self):


        try:


            import pygame


            pygame.mixer.init()  # 初始化pygame.mixer，只需要在此处初始化一次, 如果初始化失败，则不播放音频


        except Exception as e:


            util.printInfo(1, "System", "音频播放初始化失败,本机无法播放音频")


            return





        while self.__running:


            time.sleep(0.01)


            if not self.sound_query.empty():  # 如果队列不为空则播放音频


                file_url, audio_length, interact = self.sound_query.get()





                is_first = interact.data.get('isfirst') is True


                is_end = interact.data.get('isend') is True











                if file_url is not None:


                    util.printInfo(1, interact.data.get('user'), '播放音频...')





                    if is_first:


                        self.speaking = True


                    elif not is_end:


                        self.speaking = True





                #自动播报关闭


                global auto_play_lock


                global can_auto_play


                with auto_play_lock:


                    if self.timer is not None:


                        self.timer.cancel()


                        self.timer = None


                    can_auto_play = False





                if wsa_server.get_web_instance().is_connected(interact.data.get('user')):


                    wsa_server.get_web_instance().add_cmd({"panelMsg": "播放中 ...", "Username" : interact.data.get('user'), 'robot': f'{cfg.fay_url}/robot/Speaking.jpg'})





                if file_url is not None:


                    pygame.mixer.music.load(file_url)


                    pygame.mixer.music.play()
                    # 发送嘴型数据给数字人接口（在播放时才发送）
                    if "_lipsync_content" in interact.data:
                        wsa_server.get_instance().add_cmd(interact.data["_lipsync_content"])
                        util.printInfo(1, interact.data.get("user"), "播放时发送嘴型数据")






                    # 播放过程中计时，直到音频播放完毕


                    length = 0


                    while length < audio_length:


                        try:


                            user_for_stop = interact.data.get("user", "User")


                            conv_id_for_stop = interact.data.get("conversation_id")


                            if stream_manager.new_instance().should_stop_generation(user_for_stop, conversation_id=conv_id_for_stop):


                                try:


                                    pygame.mixer.music.stop()


                                except Exception:


                                    pass


                                break


                        except Exception:


                            pass


                        length += 0.01


                        time.sleep(0.01)





                if is_end:


                    self.play_end(interact)





                if wsa_server.get_web_instance().is_connected(interact.data.get('user')):


                    wsa_server.get_web_instance().add_cmd({"panelMsg": "", "Username" : interact.data.get('user'), 'robot': f'{cfg.fay_url}/robot/Normal.jpg'})


                # 播放完毕后通知


                if wsa_server.get_web_instance().is_connected(interact.data.get("user")):


                    wsa_server.get_web_instance().add_cmd({"panelMsg": "", 'Username': interact.data.get('user')})


    


    #推送远程音频


    def __send_remote_device_audio(self, file_url, interact):

        import fay_booter

        if file_url is None:


            return


        delkey = None    


        for key, value in fay_booter.DeviceInputListenerDict.items():


            if value.username == interact.data.get("user") and value.isOutput: #按username选择推送，booter.devicelistenerdice按用户名记录


                try:


                    value.deviceConnector.send(b"\x00\x01\x02\x03\x04\x05\x06\x07\x08") # 发送音频开始标志，同时也检查设备是否在线


                    wavfile = open(os.path.abspath(file_url), "rb")


                    data = wavfile.read(102400)


                    total = 0


                    while data:


                        total += len(data)


                        value.deviceConnector.send(data)


                        data = wavfile.read(102400)


                        time.sleep(0.0001)


                    value.deviceConnector.send(b'\x08\x07\x06\x05\x04\x03\x02\x01\x00')# 发送音频结束标志


                    util.printInfo(1, value.username, "远程音频发送完成：{}".format(total))


                except socket.error as serr:


                    util.printInfo(1, value.username, "远程音频输入输出设备已经断开：{}".format(key)) 


                    value.stop()


                    delkey = key


        if delkey:


             value =  fay_booter.DeviceInputListenerDict.pop(delkey)


             if wsa_server.get_web_instance().is_connected(interact.data.get('user')):


                wsa_server.get_web_instance().add_cmd({"remote_audio_connect": False, "Username" : interact.data.get('user')})





    def __is_send_remote_device_audio(self, interact):

        import fay_booter

        for key, value in fay_booter.DeviceInputListenerDict.items():


            if value.username == interact.data.get("user") and value.isOutput:


                return True


        return False 





    #输出音频处理


    def __process_output_audio(self, file_url, interact, text):


        try:


            # 会话有效性与中断检查（最早返回，避免向面板/数字人发送任何旧会话输出）


            try:


                user_for_stop = interact.data.get("user", "User")


                conv_id_for_stop = interact.data.get("conversation_id")


                if stream_manager.new_instance().should_stop_generation(user_for_stop, conversation_id=conv_id_for_stop):


                    return


            except Exception:


                pass


            try:


                if file_url is None:


                    audio_length = 0


                elif file_url.endswith('.wav'):


                    audio = AudioSegment.from_wav(file_url)


                    audio_length = len(audio) / 1000.0  # 时长以秒为单位


                elif file_url.endswith('.mp3'):


                    audio = AudioSegment.from_mp3(file_url)


                    audio_length = len(audio) / 1000.0  # 时长以秒为单位


            except Exception as e:


                audio_length = 3





            #推送远程音频


            if file_url is not None:


                MyThread(target=self.__send_remote_device_audio, args=[file_url, interact]).start()       





            #发送音频给数字人接口


            if file_url is not None and wsa_server.get_instance().get_client_output(interact.data.get("user")):


                # 使用 (username, conversation_id) 作为 key 获取会话信息


                audio_username = interact.data.get("user", "User")


                audio_conv_id = interact.data.get("conversation_id") or ""


                audio_conv_info = self.user_conv_map.get((audio_username, audio_conv_id), {})


                content = {'Topic': 'human', 'Data': {'Key': 'audio', 'Value': os.path.abspath(file_url), 'HttpValue': f'{cfg.fay_url}/audio/' + os.path.basename(file_url),  'Text': text, 'Time': audio_length, 'Type': interact.interleaver, 'IsFirst': 1 if interact.data.get("isfirst", False) else 0,  'IsEnd': 1 if interact.data.get("isend", False) else 0, 'CONV_ID' : audio_conv_info.get("conversation_id", ""), 'CONV_MSG_NO' : audio_conv_info.get("conversation_msg_no", 0)  }, 'Username' : interact.data.get('user'), 'robot': f'{cfg.fay_url}/robot/Speaking.jpg'}


                #计算lips


                if platform.system() == "Windows":


                    try:


                        # --- 1) Lip-sync data ---
                        consolidated_visemes = []
                        try:
                            if LipSyncGenerator is not None:
                                lip_sync_generator = LipSyncGenerator()
                                viseme_list = lip_sync_generator.generate_visemes(os.path.abspath(file_url))
                                consolidated_visemes = lip_sync_generator.consolidate_visemes(viseme_list)
                            else:
                                consolidated_visemes = generate_simple_lipsync(os.path.abspath(file_url), text)
                                util.printInfo(1, interact.data.get("user"), f"简易唇形: {len(consolidated_visemes)}帧")
                        except Exception as le:
                            util.printInfo(1, interact.data.get("user"), f"唇形生成失败: {le}")

                        content["Data"]["Lips"] = consolidated_visemes

                        # --- 2) Sentiment analysis ---
                        sentiment_value = 0
                        try:
                            if cfg.baidu_emotion_api_key and cfg.baidu_emotion_secret_key:
                                sentiment_value = baidu_emotion.get_sentiment(text)
                            else:
                                sentiment_value = self.__analyze_sentiment_by_keywords(text)
                        except Exception:
                            sentiment_value = self.__analyze_sentiment_by_keywords(text)
                        content["Data"]["Sentiment"] = sentiment_value
                        util.printInfo(1, interact.data.get("user"), f"情感={sentiment_value}")

                        # --- 3) Motion detection ---
                        motion_no = analyze_motion_by_keywords(text)
                        if motion_no > 0:
                            content["Data"]["MotionNo"] = motion_no
                            content["Data"]["MotionGroup"] = "TapBody"
                            util.printInfo(1, interact.data.get("user"), f"动作触发: No={motion_no}")


                    except Exception as e:
                        print(e)
                        util.printInfo(1, interact.data.get("user"), "唇型/情感/动作处理异常")


                # 存储到interact.data中，播放时才发送
                interact.data["_lipsync_content"] = content
                util.printInfo(1, interact.data.get("user"), "唇型数据已生成，等待播放时发送")





            #面板播放


            config_util.load_config()


            # 检查是否是 prestart 内容


            is_prestart = self.__has_prestart(text)

            if config_util.config["interact"]["playSound"]:


                # prestart 内容不应该进入播放队列，避免触发 Normal 状态


                if not is_prestart:


                    self.sound_query.put((file_url, audio_length, interact))


            else:


                # prestart 内容不应该重置机器人表情


                if not is_prestart and wsa_server.get_web_instance().is_connected(interact.data.get('user')):


                    wsa_server.get_web_instance().add_cmd({"panelMsg": "", 'Username' : interact.data.get('user'), 'robot': f'{cfg.fay_url}/robot/Normal.jpg'})


            


        except Exception as e:


            print(e)





    def play_end(self, interact):


        self.speaking = False


        global can_auto_play


        global auto_play_lock


        with auto_play_lock:


            if self.timer:


                self.timer.cancel()


                self.timer = None


            if interact.interleaver != 'auto_play': #交互后暂停自动播报30秒


                self.timer = threading.Timer(30, self.set_auto_play)


                self.timer.start()


            else:


                can_auto_play = True





    #恢复自动播报(如果有)   


    def set_auto_play(self):


        global auto_play_lock


        global can_auto_play


        with auto_play_lock:


            can_auto_play = True


            self.timer = None





    #启动核心服务


    def start(self):


        MyThread(target=self.__play_sound).start()





    #停止核心服务


    def stop(self):


        self.__running = False


        self.speaking = False


        self.sp.close()


        wsa_server.get_web_instance().add_cmd({"panelMsg": ""})


        content = {'Topic': 'human', 'Data': {'Key': 'log', 'Value': ""}}


        wsa_server.get_instance().add_cmd(content)





    def __record_response(self, text, username, uid):


        """


        记录AI的回复内容


        :param text: 回复文本


        :param username: 用户名


        :param uid: 用户ID


        :return: content_id


        """


        self.write_to_file("./logs", "answer_result.txt", text)


        return content_db.new_instance().add_content('fay', 'speak', text, username, uid)





    def __remove_prestart_tags(self, text):


        """


        移除文本中的 prestart 标签及其内容


        :param text: 原始文本


        :return: 移除 prestart 标签后的文本


        """


        if not text:


            return text


        import re


        # 移除 <prestart ...>...</prestart> 标签及其内容（支持属性）

        cleaned = re.sub(r'<prestart[^>]*>[\s\S]*?</prestart>', '', text, flags=re.IGNORECASE)

        return cleaned.strip()



    def __has_prestart(self, text):

        """

        判断文本中是否包含 prestart 标签（支持属性）

        """

        if not text:

            return False

        return re.search(r'<prestart[^>]*>[\s\S]*?</prestart>', text, flags=re.IGNORECASE) is not None





    def __truncate_think_for_panel(self, text, uid, username):

        if not text or not isinstance(text, str):

            return text

        key = uid if uid is not None else username

        state = self.think_display_state.get(key)

        if state is None:

            state = {"in_think": False, "in_tool_output": False, "tool_count": 0, "tool_truncated": False}

            self.think_display_state[key] = state

        if not state["in_think"] and "<think>" not in text and "</think>" not in text:

            return text

        tool_output_regex = re.compile(r"\[TOOL\]\s*(?:Output|\u8f93\u51fa)[:\uff1a]", re.IGNORECASE)

        section_regex = re.compile(r"(?i)(^|[\r\n])(\[(?:TOOL|PLAN)\])")

        out = []

        i = 0

        while i < len(text):

            if not state["in_think"]:

                idx = text.find("<think>", i)

                if idx == -1:

                    out.append(text[i:])

                    break

                out.append(text[i:idx + len("<think>")])

                state["in_think"] = True

                i = idx + len("<think>")

                continue

            if not state["in_tool_output"]:

                think_end = text.find("</think>", i)

                tool_match = tool_output_regex.search(text, i)

                next_pos = None

                next_kind = None

                if tool_match:

                    next_pos = tool_match.start()

                    next_kind = "tool"

                if think_end != -1 and (next_pos is None or think_end < next_pos):

                    next_pos = think_end

                    next_kind = "think_end"

                if next_pos is None:

                    out.append(text[i:])

                    break

                if next_pos > i:

                    out.append(text[i:next_pos])

                if next_kind == "think_end":

                    out.append("</think>")

                    state["in_think"] = False

                    state["in_tool_output"] = False

                    state["tool_count"] = 0

                    state["tool_truncated"] = False

                    i = next_pos + len("</think>")

                else:

                    marker_end = tool_match.end()

                    out.append(text[next_pos:marker_end])

                    state["in_tool_output"] = True

                    state["tool_count"] = 0

                    state["tool_truncated"] = False

                    i = marker_end

                continue

            think_end = text.find("</think>", i)

            section_match = section_regex.search(text, i)

            end_pos = None

            if section_match:

                end_pos = section_match.start(2)

            if think_end != -1 and (end_pos is None or think_end < end_pos):

                end_pos = think_end

            segment = text[i:] if end_pos is None else text[i:end_pos]

            if segment:

                if state["tool_truncated"]:

                    pass

                else:

                    remaining = self.think_display_limit - state["tool_count"]

                    if remaining <= 0:

                        out.append("...")

                        state["tool_truncated"] = True

                    elif len(segment) <= remaining:

                        out.append(segment)

                        state["tool_count"] += len(segment)

                    else:

                        out.append(segment[:remaining] + "...")

                        state["tool_count"] += remaining

                        state["tool_truncated"] = True

            if end_pos is None:

                break

            state["in_tool_output"] = False

            state["tool_count"] = 0

            state["tool_truncated"] = False

            i = end_pos

        return "".join(out)

    def __send_panel_message(self, text, username, uid, content_id=None, type=None):


        """


        发送消息到Web面板


        :param text: 消息文本


        :param username: 用户名


        :param uid: 用户ID


        :param content_id: 内容ID


        :param type: 消息类型


        """


        if not wsa_server.get_web_instance().is_connected(username):


            return





        # 检查是否是 prestart 内容，prestart 内容不应该更新日志区消息


        # 因为这会覆盖掉"思考中..."的状态显示


        is_prestart = self.__has_prestart(text)
        display_text = self.__truncate_think_for_panel(text, uid, username)




        # gui日志区消息（prestart 内容跳过，保持"思考中..."状态）


        if not is_prestart:


            wsa_server.get_web_instance().add_cmd({


                "panelMsg": display_text,


                "Username": username


            })


        


        # 聊天窗消息


        if content_id is not None:


            wsa_server.get_web_instance().add_cmd({


                "panelReply": {


                    "type": "fay",


                    "content": display_text,


                    "username": username,


                    "uid": uid,


                    "id": content_id,


                    "is_adopted": type == 'qa'


                },


                "Username": username


            })





    def __send_digital_human_message(self, text, username, is_first=False, is_end=False):


        """


        发送消息到数字人（语音应该在say方法驱动数字人输出）


        :param text: 消息文本


        :param username: 用户名


        :param is_first: 是否是第一段文本


        :param is_end: 是否是最后一段文本


        """


        # 移除 prestart 标签内容，不发送给数字人


        cleaned_text = self.__remove_prestart_tags(text) if text else ""


        full_text = self.__remove_emojis(cleaned_text.replace("*", "")) if cleaned_text else ""





        # 如果文本为空且不是结束标记，则不发送，但需保留 is_first

        if not full_text and not is_end:

            if is_first:

                self.pending_isfirst[username] = True

            return



        # 检查是否有延迟的 is_first 需要应用

        if self.pending_isfirst.get(username, False):

            is_first = True

            self.pending_isfirst[username] = False




        if wsa_server.get_instance().is_connected(username):


            content = {


                'Topic': 'human',


                'Data': {


                    'Key': 'text',


                    'Value': full_text,


                    'IsFirst': 1 if is_first else 0,


                    'IsEnd': 1 if is_end else 0


                },


                'Username': username


            }


            wsa_server.get_instance().add_cmd(content)





    def __process_text_output(self, text, username, uid, content_id, type, is_first=False, is_end=False):


        """


        完整文本输出到各个终端


        :param text: 主要回复文本


        :param textlist: 额外回复列表


        :param username: 用户名


        :param uid: 用户ID


        :param type: 消息类型


        :param is_first: 是否是第一段文本


        :param is_end: 是否是最后一段文本


        """


        if text:


            text = text.strip()


            


        # 记录主回复


        # content_id = self.__record_response(text, username, uid)


        


        # 发送主回复到面板和数字人


        self.__send_panel_message(text, username, uid, content_id, type)


        self.__send_digital_human_message(text, username, is_first, is_end)


        


        # 打印日志


        util.printInfo(1, username, '({}) {}'.format("llm", text))






    def __analyze_sentiment_by_keywords(self, text):
        """基于关键词的情感分析（优化版）
        返回: -2 ~ +2 的情感值
        -2=非常消极, -1=消极, -0.5=疑惑, 0=中性, +0.5=轻微积极, +1=积极, +2=非常积极
        """
        if not text:
            return 0

        # === 强情感信号（权重高，不会被常见词干扰） ===
        strong_positive = [
            '太棒了', '太好了', '太赞了', '完美', '绝妙', '精彩', '了不起',
            '赢了', '胜利', '冠军', '第一', '最强', '无敌',
            '欢呼', '庆祝', '恭喜', '万岁', '耶',
            '激动', '兴奋', '开心死了', '高兴死了',
            '非常感谢', '万分感谢', '太感谢了',
            '厉害', '牛逼', '牛', '神',
        ]
        strong_negative = [
            '太糟糕了', '太差了', '完蛋', '绝望', '崩溃',
            '输了', '失败', '淘汰', '出局',
            '伤心', '难过死了', '痛苦', '悲伤',
            '愤怒', '气死了', '烦死了', '恨',
            '垃圾', '废物',
        ]

        # === 中等情感信号 ===
        mild_positive = [
            '不错', '挺好', '蛮好', '还可以', '还行',
            '开心', '高兴', '快乐', '幸福',
            '喜欢', '爱', '热爱',
            '谢谢', '感谢', '多谢', '赞',
            '哈哈', '嘿嘿', '嘻嘻',
            '欢迎', '真棒', '优秀',
        ]
        mild_negative = [
            '可惜', '遗憾', '唉', '哎',
            '担心', '害怕', '紧张',
            '不好', '不对', '错误', '糟糕',
            '失望', '烦', '讨厌',
        ]

        # === 疑惑/思考信号（特殊处理） ===
        confusion_keywords = [
            '不太清楚', '不确定', '不好说', '不一定', '未必',
            '需要查一下', '查一下资料', '不敢确定', '说不好',
            '这个问题比较复杂', '让我想想', '需要分析',
        ]

        # === 惊讶信号 ===
        surprise_keywords = [
            '真的吗', '不会吧', '天哪', '我的天', '竟然', '居然',
            '难以置信', '不敢相信', '哇', 'omg', 'my god',
            '太意外了', '出乎意料', '想不到',
        ]

        # === 害羞/尴尬信号 ===
        blush_keywords = [
            '不好意思', '害羞', '尴尬', '过奖了', '哪里哪里',
            '不敢当', '谬赞', '惭愧', '献丑',
        ]

        # 强信号匹配（权重3）
        strong_pos = sum(3 for kw in strong_positive if kw in text)
        strong_neg = sum(3 for kw in strong_negative if kw in text)

        # 中等信号匹配（权重2）
        mild_pos = sum(2 for kw in mild_positive if kw in text)
        mild_neg = sum(2 for kw in mild_negative if kw in text)

        # 惊讶信号（权重2）
        surprise_count = sum(1 for kw in surprise_keywords if kw in text)

        # 害羞信号
        blush_count = sum(1 for kw in blush_keywords if kw in text)

        # 检测疑问句式
        question_count = text.count('？') + text.count('?')
        exclaim_count = text.count('！') + text.count('!')

        # 检测疑惑关键词
        confusion_count = sum(1 for kw in confusion_keywords if kw in text)

        # 计算情感值
        sentiment = strong_pos + mild_pos - strong_neg - mild_neg

        # 惊讶信号：大正向偏移
        if surprise_count > 0:
            sentiment = max(sentiment, 1.2)

        # 害羞/尴尬信号：轻微正向（不是消极）
        if blush_count > 0:
            sentiment = max(sentiment, 0.4)

        # 疑惑信号
        if confusion_count > 0:
            sentiment = -0.5  # 疑惑/思考
        elif question_count > 0 and sentiment == 0:
            sentiment = 0.2

        # 感叹号增强
        if exclaim_count > 0:
            if sentiment > 0:
                sentiment += 0.5
            elif sentiment < 0:
                sentiment -= 0.3  # 负面感叹更负面

        # 最大值限制
        if sentiment > 2:
            sentiment = 2
        elif sentiment < -2:
            sentiment = -2

        # 弱信号默认为0（中性，避免随机波动）
        if -0.3 < sentiment < 0.3:
            sentiment = 0

        return sentiment









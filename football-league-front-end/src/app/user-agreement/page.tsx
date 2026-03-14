import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function UserAgreementPage() {
    return (
        <div className="min-h-screen bg-gray-50 dark:bg-slate-950 transition-colors duration-300 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto">
                <Link href="/auth" className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-primary dark:text-gray-400 dark:hover:text-primary transition-colors mb-6">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    返回登录/注册
                </Link>

                <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl dark:shadow-2xl border border-gray-100 dark:border-white/5 overflow-hidden">
                    <div className="p-8 md:p-12">
                        <div className="text-center mb-10 pb-8 border-b-2 border-primary">
                            <div className="flex items-center justify-center mb-4">
                                <span className="text-2xl font-bold text-primary tracking-tight">足球联盟中心</span>
                            </div>
                            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">用户协议</h1>
                        </div>

                        <div className="prose prose-emerald dark:prose-invert max-w-none space-y-6 text-gray-600 dark:text-gray-300">
                            <div className="bg-orange-50 dark:bg-orange-950/30 border-l-4 border-orange-500 p-4 rounded-r-lg mb-8">
                                <p className="m-0 text-sm md:text-base font-medium text-gray-800 dark:text-gray-200">
                                    <strong>重要提示：</strong>请仔细阅读本《用户协议》（以下简称&quot;协议&quot;）并确定了解其全部内容。您在本平台的注册、登录、使用等行为即视为您已阅读并同意受本协议的约束。
                                </p>
                            </div>

                            <section>
                                <h2 className="text-xl font-bold text-primary mt-8 mb-4 pb-2 border-b border-gray-100 dark:border-gray-800">1. 协议接受</h2>
                                <p>1.1 本协议是您（以下称为&quot;用户&quot;）与足球联盟中心（以下称为&quot;本平台&quot;）之间关于使用本平台服务的法律协议。</p>
                                <p>1.2 本平台有权随时修改本协议条款，修改后的协议将在本平台公布后生效。您继续使用本平台服务即视为接受修改后的协议。</p>
                            </section>

                            <section>
                                <h2 className="text-xl font-bold text-primary mt-8 mb-4 pb-2 border-b border-gray-100 dark:border-gray-800">2. 服务说明</h2>
                                <p>2.1 本平台是一个专注于足球赛事的体育信息服务平台，提供赛事资讯、数据分析、球迷社区等服务。</p>
                                <p>2.2 本平台保留随时变更、中断或终止部分或全部服务的权利，且无需事先通知用户。</p>
                            </section>

                            <section>
                                <h2 className="text-xl font-bold text-primary mt-8 mb-4 pb-2 border-b border-gray-100 dark:border-gray-800">3. 用户账户</h2>
                                <p>3.1 您注册时需要提供真实、准确、完整的个人信息，并保持信息的及时更新。</p>
                                <p>3.2 您应对账户和密码的安全负责，不得将账户转让或出借给他人使用。</p>
                                <p>3.3 如发现任何非法使用账户或存在安全漏洞的情况，请立即通知本平台。</p>
                            </section>

                            <section>
                                <h2 className="text-xl font-bold text-primary mt-8 mb-4 pb-2 border-b border-gray-100 dark:border-gray-800">4. 用户行为规范</h2>
                                <p>4.1 您同意遵守所有适用的法律法规，包括但不限于：</p>
                                <ul className="list-disc pl-6 mt-2 space-y-2">
                                    <li>不得利用本平台从事任何非法活动；</li>
                                    <li>不得发布任何违法、侵权、骚扰、诽谤、辱骂、威胁、淫秽的信息；</li>
                                    <li>不得干扰或破坏本平台的正常运行；</li>
                                    <li>不得侵犯他人的知识产权、隐私权等合法权益。</li>
                                </ul>
                                <p className="mt-4">4.2 您应对在本平台发布的任何内容承担全部责任。</p>
                            </section>

                            <section>
                                <h2 className="text-xl font-bold text-primary mt-8 mb-4 pb-2 border-b border-gray-100 dark:border-gray-800">5. 知识产权</h2>
                                <p>5.1 本平台提供的所有内容（包括但不限于文字、图片、音频、视频、软件等）的知识产权归本平台或相关权利人所有。</p>
                                <p>5.2 未经本平台或相关权利人书面许可，您不得以任何形式复制、传播、修改或商业使用本平台的内容。</p>
                            </section>

                            <section>
                                <h2 className="text-xl font-bold text-primary mt-8 mb-4 pb-2 border-b border-gray-100 dark:border-gray-800">6. 免责声明</h2>
                                <p>6.1 本平台提供的赛事信息、数据分析等仅供参考，不构成任何投资或投注建议。</p>
                                <p>6.2 本平台不保证服务的及时性、安全性和准确性。</p>
                                <p>6.3 因不可抗力（如网络故障、系统维护等）导致的服务中断，本平台不承担任何责任。</p>
                            </section>

                            <section>
                                <h2 className="text-xl font-bold text-primary mt-8 mb-4 pb-2 border-b border-gray-100 dark:border-gray-800">7. 责任限制</h2>
                                <p>7.1 在法律允许的最大范围内，本平台对因使用服务而产生的任何直接、间接、偶然、特殊或后果性损失不承担责任。</p>
                            </section>

                            <section>
                                <h2 className="text-xl font-bold text-primary mt-8 mb-4 pb-2 border-b border-gray-100 dark:border-gray-800">8. 协议终止</h2>
                                <p>8.1 您有权随时终止使用本平台的服务。</p>
                                <p>8.2 本平台有权在您违反本协议时，暂停或终止向您提供服务。</p>
                            </section>

                            <section>
                                <h2 className="text-xl font-bold text-primary mt-8 mb-4 pb-2 border-b border-gray-100 dark:border-gray-800">9. 法律适用与争议解决</h2>
                                <p>9.1 本协议的订立、执行和解释及争议的解决均适用中华人民共和国法律。</p>
                                <p>9.2 如双方就本协议内容发生争议，应友好协商解决；协商不成的，任何一方均可向本平台所在地有管辖权的人民法院提起诉讼。</p>
                            </section>

                            <section>
                                <h2 className="text-xl font-bold text-primary mt-8 mb-4 pb-2 border-b border-gray-100 dark:border-gray-800">10. 其他</h2>
                                <p>10.1 本协议中的标题仅为方便阅读而设，不影响协议的解释。</p>
                                <p>10.2 本协议条款无论因何种原因部分无效，其余条款仍有效，对双方具有约束力。</p>
                            </section>
                        </div>

                        <div className="mt-12 pt-8 border-t border-gray-100 dark:border-gray-800 text-center">
                            <Link href="/auth" className="inline-flex items-center justify-center px-8 py-3 text-base font-medium rounded-full text-white bg-primary hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20">
                                返回登录页面
                            </Link>
                            <p className="mt-6 text-sm text-gray-500 dark:text-gray-400">
                                © 2026 足球联盟中心. All rights reserved.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

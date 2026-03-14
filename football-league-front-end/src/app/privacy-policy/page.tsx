import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function PrivacyPolicyPage() {
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
                            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">隐私条款</h1>
                        </div>

                        <div className="prose prose-emerald dark:prose-invert max-w-none space-y-6 text-gray-600 dark:text-gray-300">
                            <div className="bg-primary/5 dark:bg-primary/10 border-l-4 border-primary p-4 rounded-r-lg mb-8">
                                <p className="m-0 text-sm md:text-base font-medium text-gray-800 dark:text-gray-200">
                                    <strong>重要提示：</strong>足球联盟中心（以下简称&quot;我们&quot;或&quot;本平台&quot;）非常重视用户的隐私保护。本隐私条款说明了我们如何收集、使用、存储和保护您的个人信息。请仔细阅读本隐私条款，了解我们对您个人信息的处理方式。
                                </p>
                            </div>

                            <section>
                                <h2 className="text-xl font-bold text-primary mt-8 mb-4 pb-2 border-b border-gray-100 dark:border-gray-800">1. 信息收集</h2>
                                <p>1.1 当您注册、登录或使用本平台服务时，我们可能会收集以下信息：</p>
                                <ul className="list-disc pl-6 mt-2 space-y-2">
                                    <li><strong>账户信息：</strong>用户名、昵称、手机号码、电子邮箱地址等；</li>
                                    <li><strong>个人资料：</strong>头像、性别、年龄、所在地区等（如您选择提供）；</li>
                                    <li><strong>使用信息：</strong>浏览记录、搜索记录、互动记录、设备信息等；</li>
                                    <li><strong>支付信息：</strong>如您购买增值服务，我们可能会收集支付相关信息（由第三方支付平台处理）。</li>
                                </ul>
                            </section>

                            <section>
                                <h2 className="text-xl font-bold text-primary mt-8 mb-4 pb-2 border-b border-gray-100 dark:border-gray-800">2. 信息使用</h2>
                                <p className="mb-4">2.1 我们收集的信息将用于以下目的：</p>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse border border-gray-200 dark:border-gray-700">
                                        <thead>
                                            <tr className="bg-gray-50 dark:bg-slate-800">
                                                <th className="border border-gray-200 dark:border-gray-700 p-3 font-semibold text-gray-900 dark:text-gray-100 w-1/2">使用目的</th>
                                                <th className="border border-gray-200 dark:border-gray-700 p-3 font-semibold text-gray-900 dark:text-gray-100 w-1/2">信息类型</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                            <tr>
                                                <td className="border border-gray-200 dark:border-gray-700 p-3">提供、维护和改进我们的服务</td>
                                                <td className="border border-gray-200 dark:border-gray-700 p-3">账户信息、使用信息</td>
                                            </tr>
                                            <tr className="bg-gray-50/50 dark:bg-slate-800/50">
                                                <td className="border border-gray-200 dark:border-gray-700 p-3">处理您的交易和请求</td>
                                                <td className="border border-gray-200 dark:border-gray-700 p-3">账户信息、支付信息</td>
                                            </tr>
                                            <tr>
                                                <td className="border border-gray-200 dark:border-gray-700 p-3">个性化推荐和内容展示</td>
                                                <td className="border border-gray-200 dark:border-gray-700 p-3">浏览记录、搜索记录</td>
                                            </tr>
                                            <tr className="bg-gray-50/50 dark:bg-slate-800/50">
                                                <td className="border border-gray-200 dark:border-gray-700 p-3">发送服务通知和更新</td>
                                                <td className="border border-gray-200 dark:border-gray-700 p-3">账户信息</td>
                                            </tr>
                                            <tr>
                                                <td className="border border-gray-200 dark:border-gray-700 p-3">保障账户安全和防止欺诈</td>
                                                <td className="border border-gray-200 dark:border-gray-700 p-3">设备信息、使用信息</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </section>

                            <section>
                                <h2 className="text-xl font-bold text-primary mt-8 mb-4 pb-2 border-b border-gray-100 dark:border-gray-800">3. 信息共享与披露</h2>
                                <p>3.1 我们不会将您的个人信息出售给第三方。</p>
                                <p>3.2 在以下情况下，我们可能会共享您的信息：</p>
                                <ul className="list-disc pl-6 mt-2 space-y-2">
                                    <li>获得您的明确同意；</li>
                                    <li>为遵守法律法规、法院命令或政府要求；</li>
                                    <li>为保护本平台、用户或公众的权利、财产或安全；</li>
                                    <li>与我们的关联公司或服务提供商共享，以提供您要求的服务。</li>
                                </ul>
                            </section>

                            <section>
                                <h2 className="text-xl font-bold text-primary mt-8 mb-4 pb-2 border-b border-gray-100 dark:border-gray-800">4. 数据安全</h2>
                                <p>4.1 我们采用合理的技术和组织措施保护您的个人信息，防止未经授权的访问、使用或披露。</p>
                                <p>4.2 尽管我们采取了合理的安全措施，但请注意任何互联网传输或电子存储方法都不是100%安全的。</p>
                            </section>

                            <section>
                                <h2 className="text-xl font-bold text-primary mt-8 mb-4 pb-2 border-b border-gray-100 dark:border-gray-800">5. 数据保留</h2>
                                <p>5.1 我们只会在实现本隐私条款所述目的所需的期限内保留您的个人信息。</p>
                                <p>5.2 当您注销账户后，我们将按照法律法规要求删除或匿名化处理您的个人信息。</p>
                            </section>

                            <section>
                                <h2 className="text-xl font-bold text-primary mt-8 mb-4 pb-2 border-b border-gray-100 dark:border-gray-800">6. 您的权利</h2>
                                <p>根据相关法律法规，您对您的个人信息享有以下权利：</p>
                                <ul className="list-disc pl-6 mt-2 space-y-2">
                                    <li><strong>访问权：</strong>您可以请求访问我们持有的关于您的个人信息；</li>
                                    <li><strong>更正权：</strong>您可以要求更正不准确或不完整的个人信息；</li>
                                    <li><strong>删除权：</strong>在特定情况下，您可以要求删除您的个人信息；</li>
                                    <li><strong>限制处理权：</strong>您可以要求限制我们处理您的个人信息；</li>
                                    <li><strong>数据可携带权：</strong>您可以要求以结构化、常用格式获取您的个人信息。</li>
                                </ul>
                            </section>

                            <section>
                                <h2 className="text-xl font-bold text-primary mt-8 mb-4 pb-2 border-b border-gray-100 dark:border-gray-800">7. Cookie和类似技术</h2>
                                <p>7.1 我们使用Cookie和类似技术来提升用户体验、分析网站流量和提供个性化服务。</p>
                                <p>7.2 您可以通过浏览器设置管理或拒绝Cookie，但这可能会影响您使用本平台的某些功能。</p>
                            </section>

                            <section>
                                <h2 className="text-xl font-bold text-primary mt-8 mb-4 pb-2 border-b border-gray-100 dark:border-gray-800">8. 未成年人保护</h2>
                                <p>8.1 我们非常重视未成年人的个人信息保护。</p>
                                <p>8.2 如果您是未满18周岁的未成年人，请在法定监护人的陪同下阅读本隐私条款，并在获得法定监护人同意后使用我们的服务。</p>
                            </section>

                            <section>
                                <h2 className="text-xl font-bold text-primary mt-8 mb-4 pb-2 border-b border-gray-100 dark:border-gray-800">9. 隐私条款更新</h2>
                                <p>9.1 我们可能会不时更新本隐私条款，更新后的条款将在本平台公布后生效。</p>
                                <p>9.2 若更新涉及重大变更，我们会通过适当方式通知您。</p>
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

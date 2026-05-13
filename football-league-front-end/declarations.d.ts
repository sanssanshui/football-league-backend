// 解决 CSS 文件导入的类型声明错误
declare module "*.css" {
  const content: { [className: string]: string };
  export default content;
}

// 声明全局 Live2D 类型，避免组件中 window.Live2D 报错
declare global {
  interface Window {
    Live2D: any;
  }
}

export {};
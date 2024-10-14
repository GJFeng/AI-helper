export enum CommandType {
  /** 提出关于您所选择代码段的任何问题 */
  ask = 'ask',
  /** 解释您所选代码的工作原理 */
  explain = 'explain',
  // /** 为所选代码生成自动化文档字符串 */
  docstring = 'docstring',
  /** 提供改进所选代码的建议 */
  improve = 'improve',
  /** 为您的代码创建单元测试 */
  test = 'test',
  /** 生成图片 */
  image = 'image',
  /** 使用GPT-4的联网能力进行增强搜索和信息检索 */
  bing = 'bing',
}
export const COMMANDS_LIST = [
  {
    label: '/ask ',
    type: CommandType.ask,
    desc: '提出关于您所选择代码段的任何问题',
  },
  {
    label: '/explain ',
    type: CommandType.explain,
    desc: '解释您所选代码的工作原理',
  },
  {
    label: '/docstring ',
    type: CommandType.docstring,
    desc: '为所选代码生成自动化文档字符串',
  },
  {
    label: '/improve ',
    type: CommandType.improve,
    desc: '提供改进所选代码的建议',
  },
  {
    label: '/test ',
    type: CommandType.test,
    desc: '为您的代码创建单元测试',
  },
  {
    label: '/image ',
    type: CommandType.image,
    desc: '使用DALLE-3生成图片, 直接输入描述 (如: /image 长鼻子大象)',
  },
  // {
  //   label: '/bing ',
  //   type: CommandType.bing,
  //   desc: '使用GPT-4的联网能力进行增强搜索和信息检索',
  // },
];

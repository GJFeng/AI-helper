import * as vscode from 'vscode';
import ChatGPT from './chatGPT';

// 激活事件处理程序
export function activate(context: vscode.ExtensionContext) {
  const config = vscode.workspace.getConfiguration('ai-codehelper');

  const provider = new ChatGPT(context.extensionPath, context.extensionUri);
  /* 初始化 open ai 配置 */
  provider.setOpenAIAPIInfo({
    apiKey: config.get('apiKey'),
    apiBaseUrl: config.get('proxy'),
    model: config.get('model')!,
    // proxyUrl: config.get('proxyUrl') === "Custom" ? config.get('customProxyUrl') : config.get('proxyUrl')
  });
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(ChatGPT.viewType, provider, {
      webviewOptions: { retainContextWhenHidden: true },
    }),
    vscode.commands.registerCommand('ai-codehelper.clearing', () => {
      /* 清除会话 */
      provider.resetConversation();
    }),
    vscode.commands.registerCommand('ai-codehelper.settings', () => {
      /* 打开设置 */
      vscode.commands.executeCommand('workbench.action.openSettings', 'ai-codehelper');
    }),
    vscode.commands.registerCommand('ai-codehelper.openAIHelper', () => {
      // 激活当前插件
      vscode.commands.executeCommand('workbench.view.extension.aiHelper');
    })
  );

  // 更改配置时更改扩展的会话令牌或设置
  vscode.workspace.onDidChangeConfiguration((event: vscode.ConfigurationChangeEvent) => {
    const config = vscode.workspace.getConfiguration('ai-codehelper');
    if (
      event.affectsConfiguration('ai-codehelper.apiKey') ||
      event.affectsConfiguration('ai-codehelper.proxy') ||
      event.affectsConfiguration('ai-codehelper.model')
    ) {
      provider.setOpenAIAPIInfo({
        // mode: config.get('mode'),
        apiKey: config.get('apiKey'),
        apiBaseUrl: config.get('proxy'),
        model: config.get('model')!,
        // accessToken: config.get('accessToken'),
        // proxyUrl: config.get('proxyUrl') === "Custom" ? config.get('customProxyUrl') : config.get('proxyUrl')
      });
      // clear conversation
      provider.resetConversation();
    }
    // else if (event.affectsConfiguration('ai-codehelper.model')) {
    //   provider.setSettings({ selectedInsideCodeblock: config.get('model') });
    // } else if (event.affectsConfiguration('ai-codehelper.apiKey')) {
    //   provider.setSettings({ codeblockWithLanguageId: config.get('apiKey') });
    // } else if (event.affectsConfiguration('ai-codehelper.proxy')) {
    //   provider.setSettings({ keepConversation: config.get('proxy') });
    // }
  });
}

// This method is called when your extension is deactivated
export function deactivate() {}

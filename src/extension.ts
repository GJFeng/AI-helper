import * as vscode from 'vscode';
import ChatGPT from './chatGPT';

// 定义 Webview 的内容
function getWebviewContent() {
  return `
        <html>
        <body>
            <h1>Welcome to the Custom Page</h1>
            <p>This is a custom page in the Activity Bar.</p>
        </body>
        </html>
    `;
}

// 定义一个命令 ID，用于激活自定义页面

// 激活事件处理程序
export function activate(context: vscode.ExtensionContext) {
  const config = vscode.workspace.getConfiguration('ai-helper');

  const provider = new ChatGPT(context.extensionPath, context.extensionUri);
  /* 初始化 open ai 配置 */
  provider.setOpenAIAPIInfo({
    apiKey: config.get('apiKey'),
    // apiBaseUrl: config.get('apiBaseUrl'),
    model: config.get('model'),
    // proxyUrl: config.get('proxyUrl') === "Custom" ? config.get('customProxyUrl') : config.get('proxyUrl')
  });
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(ChatGPT.viewType, provider, {
      webviewOptions: { retainContextWhenHidden: true },
    })
  );

  // 更改配置时更改扩展的会话令牌或设置
  vscode.workspace.onDidChangeConfiguration((event: vscode.ConfigurationChangeEvent) => {
    const config = vscode.workspace.getConfiguration('ai-helper');
    if (
      event.affectsConfiguration('ai-helper.apiKey') ||
      event.affectsConfiguration('ai-helper.proxy') ||
      event.affectsConfiguration('ai-helper.model')
    ) {
      provider.setOpenAIAPIInfo({
        // mode: config.get('mode'),
        apiKey: config.get('apiKey'),
        apiBaseUrl: config.get('apiBaseUrl'),
        model: config.get('model'),
        // accessToken: config.get('accessToken'),
        // proxyUrl: config.get('proxyUrl') === "Custom" ? config.get('customProxyUrl') : config.get('proxyUrl')
      });
      // clear conversation
      provider.resetConversation();
    }
    // else if (event.affectsConfiguration('ai-helper.model')) {
    //   provider.setSettings({ selectedInsideCodeblock: config.get('model') });
    // } else if (event.affectsConfiguration('ai-helper.apiKey')) {
    //   provider.setSettings({ codeblockWithLanguageId: config.get('apiKey') });
    // } else if (event.affectsConfiguration('ai-helper.proxy')) {
    //   provider.setSettings({ keepConversation: config.get('proxy') });
    // }
  });
}

// This method is called when your extension is deactivated
export function deactivate() {}

// @ts-ignore
// import * as marked from 'marked';
import hljs from 'highlight.js';
import $ from 'jquery';
import 'jquery-ui/ui/widgets/autocomplete';
import { COMMANDS_LIST, CommandType } from '../command';
import showdown from 'showdown';
declare const acquireVsCodeApi: () => any;

const _USERNAME = '🤖 Bot AI';
interface ChatResponse {
  /** open ai 会话流 id */
  id?: string;
  /** 会话唯一键， */
  uuid?: number | string;
  text: string;
  parentMessageId?: string;
  conversationId?: string;
}

interface ChatRequest {
  /** open ai 会话流 id */
  id?: string;
  /** 会话唯一键， */
  uuid: number | string;
  /* 命令 */
  command?: CommandType;
  text: string;
  parentMessageId?: string;
  conversationId?: string;
}

type WorkingState = 'idle' | 'asking';

interface ChatEvent {
  /* 对话内容 */
  text: any;
  /* 命令 */
  command?: CommandType;
  /** open ai 会话流 id */
  id?: string;
  /** 会话唯一键， */
  uuid?: number | string;
}
(function () {
  // const vscode = acquireVsCodeApi();
  // const config = vscode.workspace.getConfiguration('chatgpt-ai');
  /** 指令 */
  const _commands = Object.values(CommandType);

  let lastResponse: ChatResponse | null = null;

  let workingState: WorkingState = 'idle';

  window.addEventListener('message', (event: MessageEvent) => {
    const { type, value } = event.data;

    switch (type) {
      case 'addRequest': {
        // 提问  - 打开新的消息页面并创建相应的标签
        renderRequest(value);
        break;
      }
      case 'addEvent':
        // 更新消息 - 异常
        // updateEvent(value);
        renderEvent(value);

        break;
      case 'addResponse': {
        // 回答 - 显示消息内容
        // document.getElementById('intro').style.display = 'none'; // 隐藏id为intro的div
        // setResponse(value);
        renderResponse(value);
        break;
      }
      case 'setResponse_image': {
        renderResponse_image(value);
        break;
      }
      case 'clearResponse': {
        // response = '';
        break;
      }
      case 'clearing': {
        clearChatHistory();
        $('#intro').show(); // 隐藏id为intro的div
        break;
      }

      case 'setWorkingState':
        // 设置工作状态
        setWorkingState(value);
        break;
      case 'setConversationId':
        // 切换 窗口 id （历史记录）
        updateConversationId(value);
        break;

      case 'setModelVersion':
        /* 设置gpt model */
        $('#model-version').html(value);
        break;
    }
  });

  /** 渲染问题  */
  function renderRequest(request: ChatRequest) {
    const { uuid, command, text } = request;

    // 提问  - 打开新的消息页面并创建相应的标签
    $('#intro').hide(); // 隐藏id为intro的div
    $('#prompt-input').val('');
    const tailwind_class = 'flex w-full rounded-xl ';

    // 创建 回答节点
    const responseDiv = $(`<div>`)
      .addClass(`${tailwind_class} justify-start chat__system-wrapper`)
      .append(
        $('<div>')
          .addClass('p-4 text-left w-full')
          .append(`<p class="text-[#E0E0E0] font-semibold mb-2">${_USERNAME}:</p>`)
          .append(
            $('<div>')
              .addClass('text-left text-[#D4D4D4] overflow-x-auto inline-block max-w-full')
              .addClass('chat__system-content')
          )
      );

    // 渲染 用户 头像名称
    const contentDiv = $('<div>')
      .addClass('p-4 w-full text-right')
      .append('<p class="text-[#E0E0E0] font-semibold mb-2">👩🏻‍💻 Code Maestro:</p>');

    // 创建 提问节点
    const askDiv = $(`<div>`).addClass(`${tailwind_class} justify-end chat__user-wrapper`).append(contentDiv);

    // 渲染 问题 根节点
    const parentDiv = $('<div>').attr('data-id', uuid);
    // 添加 提问与回答节点
    parentDiv.append(askDiv).append(responseDiv);

    // 渲染 问题内容 节点
    const questionContent = $('<pre>').addClass(
      'question-content text-[#D4D4D4] bg-[#2D2D2D] p-2 rounded-lg inline-block max-w-full overflow-x-auto'
    );
    /* 判断是否 有指令 */
    if (command) {
      const span = $('<span>').addClass('ai-command text-[#569CD6] font-bold').html(`/${command}`);
      questionContent.append(span);
    }
    // 追加内容
    questionContent.append(text);
    contentDiv.append(questionContent);

    $('#responses').append(parentDiv);
    // 渲染loading
    if (workingState === 'asking') {
      renderLoadingElement(request);
    }
    // 滚动
    scrollToBottomOfWindow();
  }

  /** 渲染回答 */
  function renderResponse(response: ChatResponse) {
    const { uuid } = response;
    // var el = document.getElementById('res-content-' + response.uuid);
    // if (el) {
    //   var converter = new showdown.Converter({
    //     omitExtraWLInCodeBlocks: true,
    //     simplifiedAutoLink: true,
    //     excludeTrailingPunctuationFromURLs: true,
    //     literalMidWordUnderscores: true,
    //     simpleLineBreaks: true,
    //   });
    //   const html = converter.makeHtml(fixCodeBlocks(response.text));
    //   el.innerHTML = html;

    //   var preCodeBlocks = document.querySelectorAll('#res-' + uuid + ' pre code');
    //   if (preCodeBlocks) {
    //     for (var i = 0; i < preCodeBlocks.length; i++) {
    //       preCodeBlocks[i].classList.add(
    //         'theme-atom-one-dark',
    //         'language-typescript',
    //         'p-2',
    //         'my-2',
    //         'block',
    //         'overflow-x-auto'
    //       );
    //       (function () {
    //         var button = $('<button>复制代码</button>').addClass(
    //           'inline-flex items-center gap-x-2 mt-2 rounded-lg bg-[#569CD6] px-3 py-2 text-center text-sm font-medium text-white hover:bg-[#4A85BA] focus:outline-none focus:ring focus:ring-[#569CD6] '
    //         );
    //         var codeStr = preCodeBlocks[i].innerText;

    //         button.on('click', () => {
    //           navigator.clipboard
    //             .writeText(codeStr)
    //             .then(() => {
    //               button.innerText = '代码已复制!';
    //             })
    //             .catch((err) => {
    //               console.error('代码复制失败:', err);
    //             });
    //           setTimeout(() => {
    //             button.innerText = '复制代码';
    //           }, 1500);
    //         });
    //         preCodeBlocks[i].parentNode.insertBefore(button, preCodeBlocks[i]);
    //       })();
    //     }
    //   }
    //   hljs.highlightAll();
    // } else {
    //   var converter = new showdown.Converter({
    //     omitExtraWLInCodeBlocks: true,
    //     simplifiedAutoLink: true,
    //     excludeTrailingPunctuationFromURLs: true,
    //     literalMidWordUnderscores: true,
    //     simpleLineBreaks: true,
    //   });
    //   const html = converter.makeHtml(fixCodeBlocks(response.text));

    //   const div = document.createElement('div');
    //   div.className = 'flex justify-start w-full bg-[#1E1E1E] rounded-xl shadow-md';
    //   div.id = 'res-' + response.uuid;

    //   const contentDiv = document.createElement('div');
    //   contentDiv.className = 'bg-[#1E1E1E] p-4 text-left w-full';
    //   div.appendChild(contentDiv);

    //   const aiLabel = document.createElement('p');
    //   aiLabel.className = 'text-[#E0E0E0] font-semibold mb-2';
    //   aiLabel.textContent = `${_USERNAME}:`;
    //   contentDiv.appendChild(aiLabel);

    //   const responseContent = document.createElement('div');
    //   responseContent.innerHTML = html;
    //   responseContent.id = 'res-content-' + uuid;
    //   responseContent.className =
    //     'bg-[#2D2D2D] p-3 rounded-xl text-left text-[#D4D4D4] overflow-x-auto inline-block max-w-full';
    //   contentDiv.appendChild(responseContent);

    //   const askEl = document.getElementById('ask-' + uuid);
    //   askEl.insertAdjacentElement('afterend', div);

    //   var preCodeBlocks = document.querySelectorAll('#res-' + uuid + ' pre code');
    //   if (preCodeBlocks) {
    //     for (var i = 0; i < preCodeBlocks.length; i++) {
    //       preCodeBlocks[i].classList.add(
    //         'theme-atom-one-dark',
    //         'language-typescript',
    //         'p-2',
    //         'my-2',
    //         'block',
    //         'overflow-x-auto'
    //       );
    //     }
    //   }
    // }
    const updatedResponseDiv = $(`div[data-id="${uuid}"]`).find('.chat__system-content');

    // let updatedResponseDiv: JQuery<HTMLElement> | null = null;

    // if (responsesDiv.children().length > 0 && (response.id === null || response?.id === lastResponse?.id)) {
    //   // Update the existing response
    //   updatedResponseDiv = responsesDiv.children().last() as JQuery<HTMLElement>;
    // } else {
    //   // 创建 新的回答节点

    //   // const newDiv = $('<div>').addClass('p-4 text-left w-full');

    //   const newDiv = $('<div>')
    //     .addClass('text-left text-[#D4D4D4] overflow-x-auto inline-block max-w-full')
    //     .addClass('chat__system-content');

    //   responsesDiv.append(newDiv);
    //   updatedResponseDiv = newDiv;
    // }
    renderCreateMessageDiv(updatedResponseDiv, response.text);

    // 滚动
    scrollToBottomOfWindow();

    lastResponse = response;
  }

  /** 渲染回答 -- 消息 */
  function renderEvent(event: ChatEvent) {
    const { uuid } = event;
    const responsesDiv = $(`div[data-id="${uuid}"]`).find('.chat__system-content');

    // const newDiv = $('<div>').addClass('p-4 text-left w-full');

    // responsesDiv.append(newDiv);
    // let updatedResponseDiv = newDiv;

    renderCreateMessageDiv(responsesDiv, event.text);
    // 滚动
    scrollToBottomOfWindow();
  }

  /** 渲染回答 -- 图片 */
  function renderResponse_image(response: ChatResponse) {
    const { uuid } = response;

    var converter = new showdown.Converter({
      omitExtraWLInCodeBlocks: true,
      simplifiedAutoLink: true,
      excludeTrailingPunctuationFromURLs: true,
      literalMidWordUnderscores: true,
      simpleLineBreaks: true,
    });
    const html = converter.makeHtml(fixCodeBlocks(response.text));

    const div = document.createElement('div');
    div.className = 'flex justify-start w-full bg-[#1E1E1E] rounded-xl shadow-md';
    div.id = 'res-' + uuid;

    const contentDiv = document.createElement('div');
    contentDiv.className = 'bg-[#1E1E1E] p-4 text-left w-full';
    div.appendChild(contentDiv);

    const aiLabel = document.createElement('div');
    aiLabel.className = 'text-[#E0E0E0] font-semibold mb-2 flex items-center';

    const aiAvatar = document.createElement('img');
    aiAvatar.src = 'https://s.xinc818.com/files/webcim1zv71gs9gbw1f/ai_avatar.jpg';
    aiAvatar.alt = 'AI Avatar';
    aiAvatar.className = 'w-8 h-8 mr-2 rounded-full';

    const aiText = document.createElement('span');
    aiText.textContent = 'Ava:';

    aiLabel.appendChild(aiAvatar);
    aiLabel.appendChild(aiText);
    contentDiv.appendChild(aiLabel);

    const responseContent = document.createElement('div');
    responseContent.innerHTML = html;
    responseContent.id = 'res-content-' + uuid;
    responseContent.className =
      'bg-[#2D2D2D] p-3 rounded-xl text-left text-[#D4D4D4] overflow-x-auto inline-block max-w-full';
    contentDiv.appendChild(responseContent);

    const askEl = document.getElementById('ask-' + uuid);
    // @ts-ignore
    askEl.insertAdjacentElement('afterend', div);

    const loadingElements = document.getElementById('loading-' + uuid);
    if (loadingElements) {
      const parentElement = loadingElements.parentNode;
      // @ts-ignore
      parentElement.removeChild(loadingElements);
    }

    hljs.highlightAll();

    // 滚动
    scrollToBottomOfWindow();
  }

  /** 创建message 并生成 */
  function renderCreateMessageDiv(div: JQuery<HTMLElement>, text: string) {
    var converter = new showdown.Converter({
      omitExtraWLInCodeBlocks: true,
      simplifiedAutoLink: true,
      excludeTrailingPunctuationFromURLs: true,
      literalMidWordUnderscores: true,
      simpleLineBreaks: true,
    });
    const html = converter.makeHtml(fixCodeBlocks(text));
    // console.log('html-----', html);
    // console.log('origin text-----', text);

    // const responseContent = $('<div>')
    //   .addClass('text-left text-[#D4D4D4] overflow-x-auto inline-block max-w-full')
    //   .addClass('chat__system-content')
    //   .html(html);

    // div.empty().append(responseContent);
    div.html(html);

    const preCodeBlocks = div.find('pre code');

    preCodeBlocks.addClass(
      `theme-atom-one-dark language-typescript p-2 my-2 block overflow-x-auto border border-[#9da5b433] bg-[#282c34]`
    );

    var button = $('<button>复制代码</button>').addClass(
      'inline-flex items-center gap-x-2 mt-1 rounded-md bg-[#569CD6] px-3 py-2 text-center text-xs font-medium text-white hover:bg-[#4A85BA] focus:outline-none focus:ring focus:ring-[#569CD6] '
    );
    button.on('click', function () {
      const text = $(this).prev().text();

      navigator.clipboard
        .writeText(text)
        .then(() => {
          button.text('代码已复制!');
        })
        .catch((err) => {
          console.error('代码复制失败:', err);
        });

      setTimeout(() => {
        button.text('复制代码');
      }, 1500);
    });
    preCodeBlocks.parent().append(button);

    const loadingEl = div.find('.chat__loadin-wrapper');
    if (loadingEl) {
      loadingEl.remove();
    }

    /* 高亮 */
    hljs.highlightAll();
  }

  /** 滚动 */
  function scrollToBottomOfWindow() {
    const messagesContainer = $('#responses');
    console.log('messagesContainer[0].scrollHeight', messagesContainer[0].scrollHeight);
    messagesContainer.scrollTop(messagesContainer[0].scrollHeight - 2);
  }

  function clearChatHistory() {
    $('#responses').html('');
  }

  function fixCodeBlocks(response: string) {
    const REGEX_CODEBLOCK = new RegExp('```', 'g');
    const matches = response.match(REGEX_CODEBLOCK);

    const count = matches ? matches.length : 0;
    return count % 2 === 0 ? response : response.concat('\n```');
  }

  /** 渲染 loading */
  function renderLoadingElement({ uuid }: Pick<ChatRequest, 'uuid'>) {
    const div = $('<div>').addClass(`chat__loadin-wrapper flex justify-start py-2`)
      .html(`<div class="loader loader--style3 ml-4" title="2">
        <svg version="1.1" id="loader-1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px"
           width="40px" height="40px" viewBox="0 0 50 50" style="enable-background:new 0 0 50 50;" xml:space="preserve">
        <path fill="#569CD6" d="M43.935,25.145c0-10.318-8.364-18.683-18.683-18.683c-10.318,0-18.683,8.365-18.683,18.683h4.068c0-8.071,6.543-14.615,14.615-14.615c8.072,0,14.615,6.543,14.615,14.615H43.935z">
          <animateTransform attributeType="xml"
            attributeName="transform"
            type="rotate"
            from="0 25 25"
            to="360 25 25"
            dur="0.6s"
            repeatCount="indefinite"/>
          </path>
        </svg>
      </div>`);
    let parentEl = $(`div[data-id="${uuid}"]`);
    parentEl.find('.chat__system-content').append(div);

    setTimeout(() => {
      parentEl
        .find('.chat__loadin-wrapper')
        .attr('class', 'chat__loadin-wrapper flex justify-start w-full bg-[#1E1E1E] rounded-xl shadow-md')
        .html(
          `<div class="bg-[#1E1E1E] p-4 text-left"><p class="text-[#E0E0E0] font-semibold mb-2">${_USERNAME}:</p><div><p class="text-[#FF6B6B] bg-[#2D2D2D] p-3 rounded-xl inline-block">服务器开小差了</p></div></div>`
        );
    }, 50000);
  }

  function updateConversationId(id: string): void {
    $('#conversation-id').text(`Conversation ID: ${id || '/'}`);
  }

  /** 清空问题 */
  function clearResponses() {
    $('#responses').empty();
    lastResponse = null;
  }

  /** 设置 消息状态  */
  function setWorkingState(state: WorkingState): void {
    workingState = state;
    toggleStopButton(workingState === 'asking');
    $('#working-state').text(workingState === 'asking' ? 'Thinking...' : '');
  }

  function toggleStopButton(enabled: boolean): void {
    if (enabled) {
      $('#send-button').hide();
      $('#stop-button').show();
      // button.prop('disabled', false).removeClass('cursor-not-allowed').addClass('bg-red-600 hover:bg-red-700');
    } else {
      $('#send-button').show();
      $('#stop-button').hide();
      // button.prop('disabled', true).removeClass('bg-red-600 hover:bg-red-700').addClass('cursor-not-allowed');
    }
  }
})();
// This script will be run within the webview itself
// It cannot access the main VS Code APIs directly.
(function () {
  const vscode = acquireVsCodeApi();
  // const config = vscode.workspace.getConfiguration('chatgpt-ai');
  /** 指令 */
  const _commands = Object.values(CommandType);

  let workingState: WorkingState = 'idle';

  /** 截取指令 */
  function removePrefix(str: string, prefix: string) {
    if (str.startsWith(prefix)) {
      return str.replace(prefix, '');
    }
    return str;
  }
  /** 发送消息 */
  function sendMessage(value: string) {
    let requestMessage;
    if (value.startsWith('/image ')) {
      /** 使用DALLE-3生成图片, 直接输入描述 (如: /image 长鼻子大象) */
      requestMessage = { task: value, context: CommandType.image };
    } else {
      let _hitCommand = false;
      _commands.forEach((command: string) => {
        if (value.startsWith(`/${command} `)) {
          _hitCommand = true;
          requestMessage = { task: removePrefix(value, `/${command} `), context: command };
        }
      });
      /* 处理没有 命中指令 */
      if (!_hitCommand) {
        requestMessage = { task: value, context: '' };
      }
    }

    vscode.postMessage({
      type: 'sendPrompt',
      value: requestMessage,
    });
  }

  // vscode.postMessage({ type: 'webviewLoaded' });

  $(document).ready(function () {
    // Listen for keyup events on the prompt input element
    const promptInput = $('#prompt-input');
    function _send() {
      if (workingState === 'asking') {
        return;
      }

      sendMessage(promptInput.val() as string);

      promptInput.val('');

      setTimeout(() => {
        workingState = 'idle';
      }, 2000);
    }
    promptInput.on('keydown', (e: JQuery.KeyDownEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        _send();
      }
    });

    $('#send-button').on('click', () => {
      _send();
    });

    // 中止输出
    $('#stop-button').on('click', () => {
      vscode.postMessage({
        type: 'abort',
      });
    });

    /*组合 命令 */
    $('#command-button').on('click', (e) => {
      _filterSelections();
      input.focus();
    });

    vscode.postMessage({ type: 'webviewLoaded' });

    const input = document.getElementById('prompt-input')!;
    const suggestions = document.getElementById('suggestions')!;
    let selectedIndex = -1;

    input.addEventListener('input', (e: Event) => {
      const { target } = e;
      const { value } = target as HTMLInputElement;

      suggestions.hidden = true;

      if (value.startsWith('/')) {
        _filterSelections(value);
      }
    });
    input.addEventListener('keydown', (e: KeyboardEvent) => {
      const { key } = e;
      const totalSuggestions = suggestions.children.length;

      if (key === 'ArrowDown') {
        if (selectedIndex < totalSuggestions - 1) {
          selectedIndex++;
        } else {
          selectedIndex = 0;
        }
        _renderSelection();
        e.preventDefault();
      } else if (key === 'ArrowUp') {
        if (selectedIndex > 0) {
          selectedIndex--;
        } else {
          selectedIndex = totalSuggestions - 1;
        }
        _renderSelection();
        e.preventDefault();
      } else if (key === 'Enter' && selectedIndex >= 0) {
        _selectSuggestion(selectedIndex);
        e.preventDefault();
      }
    });

    /** 根据value 过滤命令 */
    function _filterSelections(value: string = '') {
      const filteredCommands = COMMANDS_LIST.filter((command) => command.label.startsWith(value));

      suggestions.innerHTML = '';
      filteredCommands.forEach((command, index) => {
        const li = document.createElement('li');
        li.innerHTML = `<div><span class="font-semibold">${command.label}</span> - ${command.desc}</div>`;
        li.addEventListener('click', () => _selectSuggestion(index));
        suggestions.appendChild(li);
      });
      selectedIndex = filteredCommands.length > 0 ? 0 : -1;
      if (filteredCommands.length === 0) {
        return;
      }
      suggestions.hidden = false;
      _renderSelection();
    }
    /* 选中组合指令 */
    function _selectSuggestion(index: number) {
      const command = suggestions.children[index].textContent?.trim().split(' - ')[0];
      (input as HTMLInputElement).value = command!;
      suggestions.hidden = true;
      input.focus();
    }
    /** 渲染  ‘/’ 命令 */
    function _renderSelection() {
      Array.from(suggestions.children).forEach((child, index) => {
        child.classList.remove('bg-[#2D2D2D]', 'text-[#E0E0E0]');
        if (index === selectedIndex) {
          child.classList.add('bg-[#2D2D2D]', 'text-[#E0E0E0]');
          child.scrollIntoView({ block: 'nearest' });
        }
      });
    }
  });
})();

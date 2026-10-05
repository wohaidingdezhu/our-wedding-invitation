const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const source = fs.readFileSync(path.join(__dirname, '../src/utils/clipboard.ts'), 'utf8');
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true } }).outputText;

function setup({ modern, fallback = false } = {}) {
  const toasts = [];
  const state = { removed: false, focused: false, commandCalls: 0 };
  const field = { style: {}, select() {}, setSelectionRange() {}, remove() { state.removed = true; } };
  const sandbox = {
    exports: {}, process: { env: { TARO_ENV: 'h5' } },
    navigator: modern ? { clipboard: { writeText: modern } } : {},
    document: {
      activeElement: { focus() { state.focused = true; } },
      createElement: () => field,
      body: { appendChild() {} },
      execCommand: () => { state.commandCalls++; return fallback; }
    },
    require: name => {
      assert.equal(name, '@tarojs/taro');
      return { showToast: options => toasts.push(options) };
    }
  };
  vm.runInNewContext(code, sandbox);
  return { copy: sandbox.exports.copyText, toasts, state, field };
}

test('clipboard modern path copies exact text without fallback', async () => {
  let copied;
  const app = setup({ modern: async text => { copied = text; } });
  await app.copy('https://example.com/invitation', '已复制');
  assert.equal(copied, 'https://example.com/invitation');
  assert.equal(app.state.commandCalls, 0);
  assert.equal(app.toasts.length, 1);
});

test('rejected modern copy and false fallback do not report success', async () => {
  const app = setup({ modern: async () => { throw new Error('Permission denied'); } });
  await assert.rejects(app.copy('请帖链接'), { message: '复制未完成' });
  assert.equal(app.toasts.length, 0);
  assert.equal(app.state.removed, true);
  assert.equal(app.state.focused, true);
});

test('successful selection fallback cleans up and reports success', async () => {
  const app = setup({ fallback: true });
  await app.copy('婚礼地址');
  assert.equal(app.field.value, '婚礼地址');
  assert.equal(app.state.removed, true);
  assert.equal(app.state.focused, true);
  assert.equal(app.toasts.length, 1);
});

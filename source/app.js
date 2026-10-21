(() => {
  'use strict';
  const form = document.getElementById('plan-form');
  const byId = (id) => document.getElementById(id);
  const template = JSON.parse(byId('prompt-template').textContent);
  const status = byId('copy-status');
  const output = byId('prompt-output');
  let generatedPrompt = '';
  const checked = (name) => [...form.querySelectorAll(`input[name="${name}"]:checked`)].map((input) => input.value);
  const value = (id) => byId(id).value.trim();
  const plural = (number, one, few, many) => number % 100 >= 11 && number % 100 <= 14 ? many : number % 10 === 1 ? one : number % 10 >= 2 && number % 10 <= 4 ? few : many;

  function updateSummary() {
    const frequency = Number(byId('frequency').value);
    const total = frequency * 2;
    const mode = checked('stories')[0];
    const stories = mode === 'Без Stories' ? 0 : mode === 'Каждый день' ? 14 : total;
    byId('frequency-value').value = frequency;
    byId('frequency').style.setProperty('--fill', `${(frequency - 1) / 6 * 100}%`);
    byId('inline-total').textContent = total;
    byId('inline-word').textContent = plural(total, 'основная публикация', 'основные публикации', 'основных публикаций');
    byId('total-count').textContent = total;
    byId('total-label').textContent = plural(total, 'основная публикация', 'основные публикации', 'основных публикаций');
    byId('stories-count').textContent = stories;
    byId('stories-label').textContent = stories === 0 ? 'без Stories' : plural(stories, 'день со Stories', 'дня со Stories', 'дней со Stories');
    byId('mobile-total').textContent = `${total} ${plural(total, 'публикация', 'публикации', 'публикаций')}`;
    byId('mobile-stories').textContent = stories === 0 ? 'Без Stories' : `${stories} ${plural(stories, 'день', 'дня', 'дней')} со Stories`;
  }

  function validate() {
    let firstInvalid = null;
    for (const [id, text] of [
      ['product', 'Опишите ваш товар или услугу.'],
      ['audience', 'Укажите, для кого вы создаёте контент.'],
      ['platform', 'Укажите площадку для публикаций.'],
      ['action', 'Укажите, какое действие ждёте от покупателя.'],
    ]) {
      const invalid = !value(id);
      byId(`${id}-error`).textContent = invalid ? text : '';
      byId(id).setAttribute('aria-invalid', String(invalid));
      if (invalid && !firstInvalid) firstInvalid = byId(id);
    }
    const noGoals = checked('goals').length === 0 && !value('other-goal');
    byId('goals-error').textContent = noGoals ? 'Выберите хотя бы одну цель или укажите свою.' : '';
    if (noGoals && !firstInvalid) firstInvalid = form.querySelector('[name="goals"]');
    const noFormats = checked('formats').length === 0;
    byId('formats-error').textContent = noFormats ? 'Выберите хотя бы один доступный формат.' : '';
    if (noFormats && !firstInvalid) firstInvalid = form.querySelector('[name="formats"]');
    if (firstInvalid) {
      status.textContent = 'Осталось заполнить отмеченные поля.';
      firstInvalid.focus();
      return false;
    }
    return true;
  }

  function buildPrompt() {
    const goals = checked('goals');
    if (value('other-goal')) goals.push(value('other-goal'));
    const replacements = {
      'ПРОДУКТ': value('product'), 'АУДИТОРИЯ': value('audience'),
      'ЦЕЛИ': goals.join('; '), 'ПЛОЩАДКА': value('platform'),
      'ЦЕЛЕВОЕ_ДЕЙСТВИЕ': value('action'), 'ЧАСТОТА': byId('frequency').value,
      'ФОРМАТЫ': checked('formats').join(', '),
      'РЕЖИМ_STORIES': checked('stories')[0], 'СТИЛЬ_ПОДАЧИ': checked('style')[0],
    };
    // Single-pass replacement: user text is literal, never a template or HTML.
    return template.replace(/\{\{([^{}]+)\}\}/g, (match, key) => Object.hasOwn(replacements, key) ? replacements[key] : match);
  }

  function showResult(focus = true) {
    output.value = generatedPrompt;
    byId('result').hidden = false;
    if (focus) {
      byId('result').scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' });
      byId('result-title').focus({ preventScroll: true });
    }
  }

  async function copyPrompt() {
    // Always derive from the current form, including when using the result buttons.
    if (!validate()) return;
    generatedPrompt = buildPrompt();
    output.value = generatedPrompt;
    let copied = false;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(generatedPrompt);
        copied = true;
      }
    } catch { /* Webviews may disallow Clipboard API. Use explicit selection below. */ }
    if (!copied) {
      showResult(false);
      output.focus();
      output.select();
      output.setSelectionRange(0, output.value.length);
      try { copied = document.execCommand('copy'); } catch { copied = false; }
    }
    if (copied) {
      status.textContent = 'Промпт скопирован. Вставьте его в свою нейросеть.';
      byId('result-help').textContent = 'Промпт скопирован. Вставьте его в свою нейросеть одним сообщением.';
    } else {
      status.textContent = 'Браузер не разрешил копирование. Выделите текст ниже или скачайте .txt.';
      byId('result-help').textContent = 'Текст выделен. Скопируйте его через меню браузера или скачайте .txt.';
      byId('result').scrollIntoView({ block: 'start' });
    }
  }

  form.addEventListener('submit', (event) => { event.preventDefault(); void copyPrompt(); });
  form.addEventListener('input', () => {
    updateSummary();
    status.textContent = '';
    if (!byId('result').hidden) {
      generatedPrompt = buildPrompt();
      output.value = generatedPrompt;
      byId('result-help').textContent = 'Промпт обновлён. Скопируйте его заново, чтобы использовать новые настройки.';
    }
  });
  byId('preview-button').addEventListener('click', () => {
    if (!validate()) return;
    generatedPrompt = buildPrompt();
    showResult();
  });
  byId('copy-again').addEventListener('click', () => { void copyPrompt(); });
  byId('hide-result').addEventListener('click', () => {
    byId('result').hidden = true;
    byId('preview-button').focus();
  });
  byId('download-button').addEventListener('click', () => {
    if (!validate()) return;
    generatedPrompt = buildPrompt();
    output.value = generatedPrompt;
    const url = URL.createObjectURL(new Blob([generatedPrompt], { type: 'text/plain;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'AI-My-Time-content-plan-prompt.txt';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  updateSummary();
})();

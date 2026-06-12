// Code block headers: language label + copy button
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('div.highlighter-rouge, figure.highlight').forEach((block) => {
    const langMatch = block.className.match(/language-(\S+)/);
    const lang = langMatch ? langMatch[1] : 'text';

    const header = document.createElement('div');
    header.className = 'code-header';

    const label = document.createElement('span');
    label.textContent = lang;

    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = 'Copy';
    button.addEventListener('click', async () => {
      const code = block.querySelector('pre');
      if (!code) return;
      try {
        await navigator.clipboard.writeText(code.innerText);
        button.textContent = 'Copied ✓';
        button.classList.add('copied');
        setTimeout(() => {
          button.textContent = 'Copy';
          button.classList.remove('copied');
        }, 1500);
      } catch {
        button.textContent = 'Failed';
      }
    });

    header.append(label, button);
    block.prepend(header);
  });
});

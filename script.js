const toast = document.querySelector(".toast");
const copyButtons = document.querySelectorAll("[data-copy]");

function showToast(message) {
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("is-visible");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => {
    toast.classList.remove("is-visible");
  }, 1800);
}

async function copyText(value) {
  try {
    await navigator.clipboard.writeText(value);
    showToast("Contract copied");
  } catch {
    const input = document.createElement("textarea");
    input.value = value;
    input.setAttribute("readonly", "");
    input.style.position = "fixed";
    input.style.opacity = "0";
    document.body.appendChild(input);
    input.select();
    document.execCommand("copy");
    input.remove();
    showToast("Contract copied");
  }
}

copyButtons.forEach((button) => {
  button.addEventListener("click", () => {
    copyText(button.dataset.copy);
  });
});

if (window.lucide) {
  window.lucide.createIcons();
}

// Small helpers shared across pages.
var Utils = (function () {
  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function renderPagination(containerId, totalItems, pageSize, currentPage, onChange) {
    var container = document.getElementById(containerId);
    var totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

    if (totalPages <= 1) {
      container.innerHTML = "";
      return;
    }

    var html = '<button class="page-btn" data-page="prev"' + (currentPage === 1 ? " disabled" : "") + '>&laquo;</button>';
    for (var i = 1; i <= totalPages; i++) {
      html += '<button class="page-btn' + (i === currentPage ? " active" : "") + '" data-page="' + i + '">' + i + '</button>';
    }
    html += '<button class="page-btn" data-page="next"' + (currentPage === totalPages ? " disabled" : "") + '>&raquo;</button>';
    container.innerHTML = html;

    container.querySelectorAll(".page-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        if (btn.disabled) return;
        var val = btn.getAttribute("data-page");
        var newPage = val === "prev" ? currentPage - 1 : (val === "next" ? currentPage + 1 : parseInt(val, 10));
        onChange(newPage);
      });
    });
  }

  return {
    escapeHtml: escapeHtml,
    renderPagination: renderPagination
  };
})();

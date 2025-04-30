let currentPage = 1;
const pageSize = 10;
let nextLink = null;
let hasMoreAccounts = true;

async function fetchAccounts(append = false) {
  const accountsTable = document.getElementById("accountsTable");
  const loadMoreBtn = document.getElementById("loadMoreBtn");
  if (!accountsTable || !loadMoreBtn) return;

  try {
    const url = nextLink
      ? `/api/crm/accounts/paginated?nextLink=${encodeURIComponent(nextLink)}`
      : `/api/crm/accounts/paginated?page=${currentPage}&pageSize=${pageSize}`;
    console.log(`Fetching accounts: ${url}`);
    const response = await fetch(url);
    const data = await response.json();
    console.log(`Accounts response: ${JSON.stringify(data)}`);
    if (response.ok) {
      const accounts = data.value || [];
      nextLink = data.nextLink;
      const html = accounts.length
        ? accounts
            .map(
              (account) => `
                <tr>
                  <td>${account.name || "-"}</td>
                  <td>${account.emailaddress1 || "-"}</td>
                  <td><button class="btn btn-sm btn-outline-primary" onclick="viewAccount('${
                    account.accountid
                  }')">نمایش</button></td>
                </tr>
              `
            )
            .join("")
        : '<tr><td colspan="3" class="text-center">لیست حساب‌ها خالی است</td></tr>';

      if (append) {
        accountsTable.innerHTML += html;
      } else {
        accountsTable.innerHTML = html;
      }

      hasMoreAccounts = !!nextLink;
      if (!hasMoreAccounts) {
        loadMoreBtn.disabled = true;
        loadMoreBtn.classList.add("btn-secondary");
        loadMoreBtn.classList.remove("btn-primary");
        loadMoreBtn.textContent = "هیچ حساب دیگری وجود ندارد";
      }
    } else {
      accountsTable.innerHTML = `<tr><td colspan="3" class="text-center">خطا در بارگذاری حساب‌ها: ${
        data.error || "خطا ناشناخته"
      }</td></tr>`;
      loadMoreBtn.disabled = true;
    }
  } catch (err) {
    accountsTable.innerHTML =
      '<tr><td colspan="3" class="text-center">خطا در ارتباط با سرور</td></tr>';
    loadMoreBtn.disabled = true;
    showErrorToast("خطا در ارتباط با سرور");
  }
}

function viewAccount(accountId) {
  alert(`نمایش حساب با شناسه: ${accountId}`);
}

document.addEventListener("DOMContentLoaded", () => {
  const loadMoreBtn = document.getElementById("loadMoreBtn");

  console.log("Initializing accounts table");
  fetchAccounts();

  if (loadMoreBtn) {
    loadMoreBtn.addEventListener("click", () => {
      currentPage++;
      fetchAccounts(true);
    });
  }
});

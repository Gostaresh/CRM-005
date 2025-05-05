class AccountsManager {
  constructor() {
    this.currentPage = 1;
    this.pageSize = 10;
    this.nextLink = null;
    this.hasMoreAccounts = true;
    this.accountsTable = document.getElementById("accountsTable");
    this.loadMoreBtn = document.getElementById("loadMoreBtn");
  }

  async fetchAccounts(append = false) {
    if (!this.accountsTable || !this.loadMoreBtn) return;

    try {
      const url = this.nextLink
        ? `/api/crm/accounts/paginated?nextLink=${encodeURIComponent(
            this.nextLink
          )}`
        : `/api/crm/accounts/paginated?page=${this.currentPage}&pageSize=${this.pageSize}`;
      console.log(`Fetching accounts: ${url}`);
      const response = await fetch(url);
      const data = await response.json();
      console.log(`Accounts response: ${JSON.stringify(data)}`);
      if (response.ok) {
        const accounts = data.value || [];
        this.nextLink = data.nextLink;
        const html = accounts.length
          ? accounts
              .map(
                (account) => `
                  <tr>
                    <td>${account.name || "-"}</td>
                    <td>${account.emailaddress1 || "-"}</td>
                    <td><button class="btn btn-sm btn-outline-primary" onclick="accountsManager.viewAccount('${
                      account.accountid
                    }')">نمایش</button></td>
                  </tr>
                `
              )
              .join("")
          : '<tr><td colspan="3" class="text-center">لیست حساب‌ها خالی است</td></tr>';

        if (append) {
          this.accountsTable.innerHTML += html;
        } else {
          this.accountsTable.innerHTML = html;
        }

        this.hasMoreAccounts = !!this.nextLink;
        if (!this.hasMoreAccounts) {
          this.loadMoreBtn.disabled = true;
          this.loadMoreBtn.classList.add("btn-secondary");
          this.loadMoreBtn.classList.remove("btn-primary");
          this.loadMoreBtn.textContent = "هیچ حساب دیگری وجود ندارد";
        }
      } else {
        this.accountsTable.innerHTML = `<tr><td colspan="3" class="text-center">خطا در بارگذاری حساب‌ها: ${
          data.error || "خطا ناشناخته"
        }</td></tr>`;
        this.loadMoreBtn.disabled = true;
      }
    } catch (err) {
      this.accountsTable.innerHTML =
        '<tr><td colspan="3" class="text-center">خطا در ارتباط با سرور</td></tr>';
      this.loadMoreBtn.disabled = true;
      Utils.showErrorToast("خطا در ارتباط با سرور");
    }
  }

  viewAccount(accountId) {
    alert(`نمایش حساب با شناسه: ${accountId}`);
  }

  initialize() {
    console.log("Initializing accounts table");
    this.fetchAccounts();

    if (this.loadMoreBtn) {
      this.loadMoreBtn.addEventListener("click", () => {
        this.currentPage++;
        this.fetchAccounts(true);
      });
    }
  }
}

document.addEventListener("DOMContentLoaded", () => {
  window.accountsManager = new AccountsManager();
  window.accountsManager.initialize();
});

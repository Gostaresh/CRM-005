// src/constants/taskOptions.ts
// -----------------------------------------------------------------------------
// Static option arrays and mappings reused across task-related components.
// -----------------------------------------------------------------------------

export const ACTIVITY_DISPLAY_NAMES: Record<string, string> = {
  new_returncustomer: 'مشتری برگشته',
  socialactivity: 'فعالیت اجتماعی',
  serviceappointment: 'فعالیت خدماتی',
  new_takhfif: 'اعمال تخفیف',
  incidentresolution: 'حل پرونده خدمات',
  new_sms: 'SMS',
  campaignresponse: 'پاسخ کمپین بازاریابی',
  new_peigirihesab: 'پیگیری حساب',
  fax: 'نمابر',
  letter: 'نامه',
  new_mosaedeh: 'درخواست مسائده حقوق',
  new_dissatisfaction: 'نارضایتی مشتری',
  new_pilotfollowing: 'پیگیری پایلوت',
  opportunityclose: 'بستن پرونده فروش',
  appointment: 'قرارملاقات',
  task: 'وظیفه',
  quoteclose: 'بستن پیش فاکتور',
  bulkoperation: 'کمپین سریع',
  new_downtrendcustomer: 'کم فعال',
  new_morakhasi: 'مرخصی',
  phonecall: 'تماس تلفنی',
  new_urgentfollowup: 'پیگیری فوری',
  untrackedemail: 'UntrackedEmail',
  new_carditinception: 'بررسی کریدیت',
  new_customerlostfollowup: 'فراموش شده',
  new_receiptpaymentapproval: 'تأییدیه پرداخت',
  campaignactivity: 'فعالیت کمپین',
  new_pardakht: 'پرداخت وجه',
  new_daryaft: 'دریافت وجه',
  new_testactivity: 'TestActivity',
  orderclose: 'بستن سفارش',
  recurringappointmentmaster: 'ملاقات تکرارشونده',
  new_assembly: 'اسمبل نرم افزار و عیب یابی',
  email: 'ایمیل',
}

export const PRIORITY_OPTIONS = [
  { label: 'کم', value: 0 },
  { label: 'متوسط', value: 1 },
  { label: 'زیاد', value: 2 },
] as const

export const SEEN_OPTIONS = [
  { label: 'دیده شده', value: 1 },
  { label: 'دیده نشده', value: 0 },
] as const

export const STATE_OPTIONS = [
  { label: 'باز', value: 0 },
  { label: 'اتمام کار', value: 1 },
  { label: 'لغو شده', value: 2 },
  { label: 'برنامه ریزی شده', value: 3 },
] as const

const formatDate = (date) => {
  if (!(date instanceof Date) || isNaN(date.getTime())) {
    console.error("Invalid Date object:", date);
    throw new Error("The provided input is not a valid Date object:");
  }
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatDateTime = (date) => {
  if (!(date instanceof Date) || isNaN(date.getTime())) {
    console.error("Invalid Date object:", date);
    throw new Error("The provided input is not a valid Date object:");
  }
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
};

const translateStatus = (status) => {
  switch (status) {
    case 'hold':
      return '保留中';
    case 'provisory':
      return '仮予約';
    case 'confirmed':
      return '確定';
    case 'checked_in':
      return 'チェックイン';
    case 'checked_out':
      return 'チェックアウト';
    case 'cancelled':
      return 'キャンセル';
    case 'block':
      return '予約不可';
    default:
      return '不明';
  }
};

const translateReservationPaymentTiming = (timing) => {
  switch (timing) {
    case 'not_set':
      return '未設定';
    case 'prepaid':
      return '事前決済';
    case 'on-site':
      return '現地決済';
    case 'postpaid':
      return '後払い';
    default:
      return '';
  }
};

const translateType = (type) => {
  switch (type) {
    case 'default':
      return '通常';
    case 'employee':
      return '社員';
    case 'ota':
      return 'OTA';
    case 'web':
      return '自社ウェブ';
    default:
      return '不明';
  }
};

const translatePlanType = (type) => {
  switch (type) {
    case 'per_person':
      return '一人当たり';
    case 'per_room':
      return '部屋当たり';
    default:
      return '不明';
  }
};

const translateMealType = (type) => {
  const translations = {
    'breakfast': '朝食',
    'lunch': '昼食',
    'dinner': '夕食'
  };
  return translations[type] || type;
};

module.exports = {
  formatDate,
  formatDateTime,
  translateStatus,
  translateReservationPaymentTiming,
  translateType,
  translatePlanType,
  translateMealType,
};

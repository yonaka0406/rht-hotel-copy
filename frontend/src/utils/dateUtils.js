export const daysOfWeek = [
    { label: '月曜日', value: 'mon' },
    { label: '火曜日', value: 'tue' },
    { label: '水曜日', value: 'wed' },
    { label: '木曜日', value: 'thu' },
    { label: '金曜日', value: 'fri' },
    { label: '土曜日', value: 'sat' },
    { label: '日曜日', value: 'sun' },
];

export const months = [
    { label: '１月', value: 'january' },
    { label: '２月', value: 'february' },
    { label: '３月', value: 'march' },
    { label: '４月', value: 'april' },
    { label: '５月', value: 'may' },
    { label: '６月', value: 'june' },
    { label: '７月', value: 'july' },
    { label: '８月', value: 'august' },
    { label: '９月', value: 'september' },
    { label: '１０月', value: 'october' },
    { label: '１１月', value: 'november' },
    { label: '１２月', value: 'december' }
];

export const formatTime = (time) => {
  if (!time) return "";
  // Check if time is already a Date object
  if (time instanceof Date) {
    if (isNaN(time.getTime())) {
      return ''; // Return empty string for invalid Date objects
    }
    return time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  // If time is a string
  const date = new Date(`1970-01-01T${time}`);
  if (isNaN(date.getTime())) {
    return ''; // Return empty string for invalid times
  }
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

export const formatDate = (date) => {
  if (!date) return null;
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const formatDateWithDay = (date) => {
  const options = { weekday: 'short', year: 'numeric', month: '2-digit', day: '2-digit' };
  const parsedDate = new Date(date);
  return `${parsedDate.toLocaleDateString('ja-JP', options)}`;
};

export const formatDateTime = (dateString) => {
  if (!dateString) return null;

  const d = new Date(dateString);

  if (isNaN(d.getTime())) {
    console.warn(`Invalid date object created from: ${dateString}`);
    return null;
  }

  const options = {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Tokyo'
  };

  const formattedDate = d.toLocaleString('ja-JP', options);

  return formattedDate.replace(/\//g, '/');
};

export const formatDateTimeWithSeconds = (dateString) => {
  if (!dateString) return null;

  const d = new Date(dateString);

  if (isNaN(d.getTime())) {
    console.warn(`Invalid date object created from: ${dateString}`);
    return null;
  }

  const options = {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit', // Added seconds
    hour12: false,
    timeZone: 'Asia/Tokyo'
  };

  const formattedDate = d.toLocaleString('ja-JP', options);

  return formattedDate.replace(/\//g, '/');
};

export const formatDateTimeJP = (dateString) => {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${year}年${month}月${day}日 ${hours}:${minutes}`;
  } catch (_e) {
    return dateString;
  }
};

export const formatDateJP = (dateString) => {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}年${month}月${day}日`;
  } catch (_e) {
    return dateString;
  }
};

export const formatDateToYYMMDD = (dateString) => {
  if (!dateString || dateString.length !== 8) return '';
  const formattedDateString = `${dateString.slice(0, 4)}-${dateString.slice(4, 6)}-${dateString.slice(6, 8)}`;
  const date = new Date(formattedDateString);
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}/${month}/${day}`;
};
export const formatTime = (time) => {
  if (!time) return "";
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

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

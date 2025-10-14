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

  let d;

  const isIsoWithTimezone = dateString.includes('T') && (dateString.endsWith('Z') || /[+\-]\d{2}:?\d{2}$/.test(dateString));

  if (isIsoWithTimezone) {
    d = new Date(dateString);
  } else {
    const parts = dateString.match(/(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})(?:\.(\d{3}))?/);
    if (parts) {
      const year = parseInt(parts[1], 10);
      const month = parseInt(parts[2], 10) - 1;
      const day = parseInt(parts[3], 10);
      const hour = parseInt(parts[4], 10);
      const minute = parseInt(parts[5], 10);
      const second = parseInt(parts[6], 10);
      const millisecond = parseInt(parts[7] || '0', 10);

      d = new Date(Date.UTC(year, month, day, hour, minute, second, millisecond));
    } else {
      console.warn(`Invalid date string for formatDateTime: ${dateString}`);
      return null;
    }
  }

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

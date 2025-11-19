const redactCommonRequest = (xml) => {
  if (!xml) return '';
  // This regex will match <commonRequest> and </commonRequest> and everything in between, including attributes and namespaces.
  // The 's' flag makes '.' match newlines.
  return xml.replace(/<commonRequest[^>]*>.*?<\/commonRequest>/s, '<commonRequest>...</commonRequest>');
};

module.exports = {
  redactCommonRequest,
};

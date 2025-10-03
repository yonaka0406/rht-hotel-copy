export const paymentTimingText = (timing) => {
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

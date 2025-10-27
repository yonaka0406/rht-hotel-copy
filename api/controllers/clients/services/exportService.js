const excel = require('exceljs');

const exportClientsToFile = async (clients) => {
  const workbook = new excel.Workbook();
  const worksheet = workbook.addWorksheet('Clients');

  worksheet.columns = [
    { header: '氏名・名称（漢字）', key: 'name_kanji', width: 30 },
    { header: '氏名・名称（カナ）', key: 'name_kana', width: 30 },
    { header: '氏名・名称', key: 'name', width: 30 },
    { header: '性別', key: 'gender', width: 15 },
    { header: 'メールアドレス', key: 'email', width: 30 },
    { header: '電話番号', key: 'phone', width: 20 },
    { header: 'FAX', key: 'fax', width: 20 },
    { header: '請求方法', key: 'billing_preference', width: 20 },
    { header: 'ウェブサイト', key: 'website', width: 30 },
    { header: '顧客ID', key: 'customer_id', width: 20 },
    { header: '取引制限', key: 'restriction_level', width: 20 },
    { header: 'ID', key: 'id', width: 38 },
    { header: 'コメント', key: 'comment', width: 50 },
    { header: '作成日', key: 'created_at', width: 20 },
  ];

  clients.forEach(client => {
    worksheet.addRow(client);
  });

  return workbook;
};

module.exports = {
  exportClientsToFile,
};

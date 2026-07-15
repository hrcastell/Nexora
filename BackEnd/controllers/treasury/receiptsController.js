const createPaymentApplicationsController = require('./paymentApplicationsControllerFactory');

module.exports = createPaymentApplicationsController({
    entityName: 'recibo',
    entityTable: 'treasury_receipts',
    entityIdColumn: 'id',
    numberColumn: 'receipt_number',
    dateColumn: 'receipt_date',
    applicationTable: 'treasury_receipt_applications',
    applicationEntityColumn: 'receipt_id',
    direction: 'receivable',
    notificationTitle: 'Recibo aplicado',
    routePath: '/treasury/receipts'
});

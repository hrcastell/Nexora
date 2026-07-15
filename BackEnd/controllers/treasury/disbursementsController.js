const createPaymentApplicationsController = require('./paymentApplicationsControllerFactory');

module.exports = createPaymentApplicationsController({
    entityName: 'pago emitido',
    entityTable: 'treasury_disbursements',
    entityIdColumn: 'id',
    numberColumn: 'disbursement_number',
    dateColumn: 'payment_date',
    applicationTable: 'treasury_disbursement_applications',
    applicationEntityColumn: 'disbursement_id',
    direction: 'payable',
    notificationTitle: 'Pago emitido aplicado',
    routePath: '/treasury/disbursements'
});

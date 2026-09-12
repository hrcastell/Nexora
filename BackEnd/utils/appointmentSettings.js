function normalizeMaxAppointmentsPerDay(value) {
    if (value === null || value === undefined || value === '') return null;

    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed < 1) {
        const error = new Error('El máximo de citas por día debe ser un número entero mayor o igual a 1.');
        error.statusCode = 400;
        throw error;
    }

    return parsed;
}

module.exports = { normalizeMaxAppointmentsPerDay };

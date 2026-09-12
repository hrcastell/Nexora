const { test } = require('node:test');
const assert = require('node:assert/strict');
const { normalizeMaxAppointmentsPerDay } = require('../utils/appointmentSettings');

test('daily appointment limit accepts unlimited and positive integers', () => {
    assert.equal(normalizeMaxAppointmentsPerDay(null), null);
    assert.equal(normalizeMaxAppointmentsPerDay(undefined), null);
    assert.equal(normalizeMaxAppointmentsPerDay(''), null);
    assert.equal(normalizeMaxAppointmentsPerDay(1), 1);
    assert.equal(normalizeMaxAppointmentsPerDay('25'), 25);
});

test('daily appointment limit rejects zero, negatives, decimals and text', () => {
    for (const value of [0, -1, 1.5, '2.5', 'not-a-number']) {
        assert.throws(
            () => normalizeMaxAppointmentsPerDay(value),
            error => error.statusCode === 400 && /mayor o igual a 1/.test(error.message)
        );
    }
});

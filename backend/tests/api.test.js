const test = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../app');
const User = require('../models/User');
const PeriodRecord = require('../models/PeriodRecord');
const SymptomLog = require('../models/SymptomLog');
const HealthAlert = require('../models/HealthAlert');

// Use a distinct test database
const TEST_DB_URI = 'mongodb://127.0.0.1:27017/herhealth_test_db';

test.before(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  await mongoose.connect(TEST_DB_URI);
  await mongoose.connection.dropDatabase();
});

test.after(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
  setTimeout(() => process.exit(0), 100);
});

test('HerHealth AI Backend Comprehensive Test Suite', async (t) => {
  const agent = request.agent(app);
  let createdPeriodId = null;
  const testUser = {
    name: 'Aria Sharma',
    email: `aria_${Date.now()}@example.com`,
    password: 'securePassword123',
    age: 24,
    privacyConsent: true
  };

  await t.test('1. Should successfully register a new user', async () => {
    const res = await agent
      .post('/api/auth/register')
      .send(testUser);

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.user.email, testUser.email);
    assert.strictEqual(res.body.user.passwordHash, undefined, 'Password hash must never be returned to client');
  });

  await t.test('2. Should reject registration with duplicate email', async () => {
    const res = await agent
      .post('/api/auth/register')
      .send(testUser);

    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.success, false);
    assert.match(res.body.error, /already registered/i);
  });

  await t.test('3. Should verify authenticated session via /api/auth/me', async () => {
    const res = await agent.get('/api/auth/me');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.user.name, testUser.name);
  });

  await t.test('4. Should reject unauthenticated requests on protected endpoints', async () => {
    const unauthAgent = request(app);
    const res = await unauthAgent.get('/api/periods');
    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.body.success, false);
  });

  await t.test('5. Should create a valid menstrual period record and compute cycle metrics', async () => {
    const periodPayload = {
      startDate: new Date('2026-10-01'),
      endDate: new Date('2026-10-05'),
      flowIntensity: 'medium',
      notes: 'Normal mild cramping on day 1.'
    };

    const res = await agent
      .post('/api/periods')
      .send(periodPayload);

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.success, true);
    assert.ok(res.body.record._id);
    createdPeriodId = res.body.record._id;
    assert.ok(res.body.metrics);
    assert.strictEqual(res.body.metrics.averagePeriodDuration, 5);
  });

  await t.test('6. Should reject period record where end date precedes start date', async () => {
    const invalidPeriod = {
      startDate: new Date('2026-10-10'),
      endDate: new Date('2026-10-05'),
      flowIntensity: 'heavy'
    };

    const res = await agent
      .post('/api/periods')
      .send(invalidPeriod);

    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.success, false);
    assert.match(res.body.error, /cannot precede/i);
  });

  await t.test('7. Should record daily symptoms and trigger evidence-based health alert if pain is severe', async () => {
    const symptomPayload = {
      date: new Date('2026-10-02'),
      symptoms: ['cramps', 'fatigue', 'headache'],
      painLevel: 9, // Severe pain triggers high alert
      mood: 'fatigued',
      flowInformation: 'heavy',
      notes: 'Bedridden with debilitating cramps.'
    };

    const res = await agent
      .post('/api/symptoms')
      .send(symptomPayload);

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.success, true);
    assert.ok(res.body.triggeredAlerts.length > 0, 'Severe pain must trigger an alert');
    assert.strictEqual(res.body.triggeredAlerts[0].severity, 'urgent');
  });

  await t.test('8. Should return AI educational guidance in honest demo mode when no external key', async () => {
    const res = await agent
      .post('/api/ai/chat')
      .send({ message: 'Why do menstrual cramps occur?' });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.isDemoFallback, true);
    assert.match(res.body.reply, /prostaglandins/i);
    assert.ok(res.body.disclaimer);
  });

  await t.test('9. Should trigger urgent safety triage in AI chat when red flag symptoms mentioned', async () => {
    const res = await agent
      .post('/api/ai/chat')
      .send({ message: 'I feel like I fainted and am dizzy while bleeding heavily' });

    assert.strictEqual(res.status, 200);
    assert.match(res.body.reply, /URGENT/i);
    assert.match(res.body.reply, /emergency medical/i);
  });

  await t.test('10. Should save and retrieve health questionnaire responses', async () => {
    const assessmentPayload = {
      answers: {
        typicalCycleLength: 29,
        periodDuration: 5,
        painSeverity: 6,
        commonSymptoms: ['cramps', 'bloating'],
        bleedingPattern: 'Moderate flow with occasional clotting'
      },
      completionStatus: 'completed',
      currentStep: 6
    };

    const res = await agent
      .post('/api/assessments')
      .send(assessmentPayload);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.assessment.completionStatus, 'completed');
    assert.ok(res.body.summary.observations.length > 0);
  });

  await t.test('11. Should generate report preview JSON with verified real user data', async () => {
    const res = await agent
      .post('/api/reports/generate')
      .send({ personalNotes: 'To discuss at annual checkup.' });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.report.patient.name, testUser.name);
    assert.ok(res.body.report.periods.length >= 1);
    assert.ok(res.body.report.suggestedQuestions.length >= 3);
  });

  await t.test('12. Should download doctor-ready PDF report', async () => {
    const res = await agent.get('/api/reports/download');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.headers['content-type'], 'application/pdf');
    assert.ok(res.body.length > 500, 'PDF buffer should be substantial');
  });

  await t.test('13. Should log completed wellness activity and record daily hydration', async () => {
    const actRes = await agent
      .post('/api/wellness/activities')
      .send({
        activityType: 'yoga',
        activityName: 'Balasana (Child\'s Pose)',
        duration: 5,
        notes: 'Felt very restorative.'
      });
    assert.strictEqual(actRes.status, 201);

    const hydRes = await agent
      .post('/api/wellness/hydration')
      .send({ addGlasses: 2 });
    assert.strictEqual(hydRes.status, 200);
    assert.strictEqual(hydRes.body.hydration.glasses, 2);
    assert.strictEqual(hydRes.body.hydration.amountMl, 500);
  });

  await t.test('14. Should enforce user data isolation (User B cannot see or delete User A records)', async () => {
    const userB_Agent = request.agent(app);
    await userB_Agent
      .post('/api/auth/register')
      .send({
        name: 'Maya Patel',
        email: `maya_${Date.now()}@example.com`,
        password: 'anotherPassword456',
        privacyConsent: true
      });

    // User B tries to view User A's periods
    const periodsRes = await userB_Agent.get('/api/periods');
    assert.strictEqual(periodsRes.status, 200);
    assert.strictEqual(periodsRes.body.records.length, 0, 'User B should see 0 records');

    // User B tries to delete User A's period
    const delRes = await userB_Agent.delete(`/api/periods/${createdPeriodId}`);
    assert.strictEqual(delRes.status, 404, 'User B must not be able to delete User A record');
  });
});

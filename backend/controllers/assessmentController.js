/**
 * HerHealth AI — Assessment/Questionnaire Controller (Firebase Firestore)
 */
const { getFirestore } = require('../config/firebase');
const { FieldValue } = require('firebase-admin/firestore');
const {
  evaluateQuestionnaire,
  validateQuestionnaireAnswers
} = require('../services/questionnaireAssessmentService');

function getValidatedAnswers(input) {
  const validation = validateQuestionnaireAnswers(input);
  return validation.errors.length
    ? { errors: validation.errors }
    : { answers: validation.answers };
}

exports.previewAssessment = async (req, res) => {
  const result = getValidatedAnswers(req.body.answers);
  if (result.errors) return res.status(400).json({ success: false, errors: result.errors });
  return res.status(200).json({ success: true, assessment: evaluateQuestionnaire(result.answers) });
};

exports.submitQuestionnaire = async (req, res, next) => {
  try {
    const uid = req.user.uid;
    const { answers = {}, currentStep = 6, completionStatus = 'completed' } = req.body;

    const result = getValidatedAnswers(answers);
    if (result.errors) return res.status(400).json({ success: false, errors: result.errors });
    if (!['completed', 'in_progress'].includes(completionStatus)) {
      return res.status(400).json({ success: false, error: 'Invalid completion status.' });
    }

    const assessmentResult = evaluateQuestionnaire(result.answers);
    const db = getFirestore();

    let submission;
    if (completionStatus === 'completed') {
      // Find existing in-progress draft to finalize
      const draftSnap = await db.collection('questionnaires')
        .where('userId', '==', uid)
        .where('completionStatus', '==', 'in_progress')
        .limit(1).get();

      const docRef = draftSnap.empty
        ? db.collection('questionnaires').doc()
        : draftSnap.docs[0].ref;

      const data = {
        userId: uid,
        answers: result.answers,
        currentStep: Number(currentStep),
        completionStatus: 'completed',
        submittedAt: new Date().toISOString(),
        assessment: {
          level: assessmentResult.level,
          levelName: assessmentResult.levelName,
          colorCode: assessmentResult.colorCode,
          badgeClass: assessmentResult.badgeClass,
          icon: assessmentResult.icon,
          title: assessmentResult.title,
          bannerText: assessmentResult.bannerText,
          actionHeader: assessmentResult.actionHeader,
          urgencyStatement: assessmentResult.urgencyStatement,
          triggeredRules: assessmentResult.triggeredRules,
          explanations: assessmentResult.explanations,
          recommendedNextSteps: assessmentResult.recommendedNextSteps,
          evaluatedAt: new Date().toISOString()
        },
        updatedAt: FieldValue.serverTimestamp()
      };

      await docRef.set(data, { merge: true });
      submission = { id: docRef.id, _id: docRef.id, ...data };
    } else {
      // Save draft
      const draftSnap = await db.collection('questionnaires')
        .where('userId', '==', uid)
        .where('completionStatus', '==', 'in_progress')
        .limit(1).get();

      const draftData = {
        userId: uid,
        answers: result.answers,
        currentStep: Number(currentStep) || 1,
        completionStatus: 'in_progress',
        updatedAt: FieldValue.serverTimestamp()
      };

      let docRef;
      if (draftSnap.empty) {
        docRef = db.collection('questionnaires').doc();
        await docRef.set({ ...draftData, createdAt: FieldValue.serverTimestamp() });
      } else {
        docRef = draftSnap.docs[0].ref;
        await docRef.set(draftData, { merge: true });
      }
      const updated = await docRef.get();
      submission = { id: updated.id, _id: updated.id, ...updated.data() };
    }

    return res.status(completionStatus === 'completed' ? 201 : 200).json({
      success: true,
      message: completionStatus === 'completed' ? 'Questionnaire submitted and evaluated.' : 'Draft saved.',
      submission, assessment: assessmentResult, assessmentResult,
      summary: {
        completionDate: new Date().toLocaleDateString(),
        level: assessmentResult.level,
        levelName: assessmentResult.levelName,
        observations: assessmentResult.explanations,
        disclaimer: assessmentResult.disclaimer
      }
    });
  } catch (err) {
    next(err);
  }
};

exports.saveDraft = async (req, res, next) => {
  try {
    const uid = req.user.uid;
    const { answers = {}, currentStep = 1 } = req.body;
    const result = getValidatedAnswers(answers);
    if (result.errors) return res.status(400).json({ success: false, errors: result.errors });

    const db = getFirestore();
    const draftSnap = await db.collection('questionnaires')
      .where('userId', '==', uid)
      .where('completionStatus', '==', 'in_progress')
      .limit(1).get();

    const draftData = {
      userId: uid, answers: result.answers,
      currentStep: Number(currentStep), completionStatus: 'in_progress',
      updatedAt: FieldValue.serverTimestamp()
    };

    let docRef;
    if (draftSnap.empty) {
      docRef = db.collection('questionnaires').doc();
      await docRef.set({ ...draftData, createdAt: FieldValue.serverTimestamp() });
    } else {
      docRef = draftSnap.docs[0].ref;
      await docRef.set(draftData, { merge: true });
    }

    const updated = await docRef.get();
    return res.status(200).json({
      success: true, message: 'Draft saved.',
      draft: { id: updated.id, _id: updated.id, ...updated.data() }
    });
  } catch (err) {
    next(err);
  }
};

exports.getLatest = async (req, res, next) => {
  try {
    const uid = req.user.uid;
    const db = getFirestore();
    const snap = await db.collection('questionnaires')
      .where('userId', '==', uid)
      .orderBy('updatedAt', 'desc')
      .limit(1).get();

    if (snap.empty) {
      return res.status(200).json({ success: true, submission: null, assessment: null, assessmentData: null, summary: null });
    }

    const doc = snap.docs[0];
    const submission = { id: doc.id, _id: doc.id, ...doc.data() };
    const assessment = submission.answers ? evaluateQuestionnaire(submission.answers) : null;

    return res.status(200).json({
      success: true, submission, assessment, assessmentData: submission,
      summary: assessment ? {
        completionDate: submission.submittedAt ? new Date(submission.submittedAt).toLocaleDateString() : new Date().toLocaleDateString(),
        level: assessment.level, levelName: assessment.levelName,
        observations: assessment.explanations, disclaimer: assessment.disclaimer
      } : null
    });
  } catch (err) {
    next(err);
  }
};

exports.getHistory = async (req, res, next) => {
  try {
    const uid = req.user.uid;
    const db = getFirestore();
    const snap = await db.collection('questionnaires')
      .where('userId', '==', uid)
      .where('completionStatus', '==', 'completed')
      .orderBy('updatedAt', 'desc')
      .limit(30).get();

    const history = snap.docs.map(d => ({ id: d.id, _id: d.id, ...d.data() }));
    return res.status(200).json({ success: true, count: history.length, history });
  } catch (err) {
    next(err);
  }
};

exports.getById = async (req, res, next) => {
  try {
    const uid = req.user.uid;
    const db = getFirestore();
    const doc = await db.collection('questionnaires').doc(req.params.id).get();
    if (!doc.exists || doc.data().userId !== uid) {
      return res.status(404).json({ success: false, error: 'Submission not found.' });
    }
    const submission = { id: doc.id, _id: doc.id, ...doc.data() };
    const assessment = evaluateQuestionnaire(submission.answers);
    return res.status(200).json({ success: true, submission, assessment });
  } catch (err) {
    next(err);
  }
};

exports.getAssessmentById = async (req, res, next) => {
  try {
    const uid = req.user.uid;
    const db = getFirestore();
    const doc = await db.collection('questionnaires').doc(req.params.id).get();
    if (!doc.exists || doc.data().userId !== uid) {
      return res.status(404).json({ success: false, error: 'Submission not found.' });
    }
    const assessment = evaluateQuestionnaire(doc.data().answers);
    return res.status(200).json({ success: true, submissionId: doc.id, assessment });
  } catch (err) {
    next(err);
  }
};

exports.deleteById = async (req, res, next) => {
  try {
    const uid = req.user.uid;
    const db = getFirestore();
    const docRef = db.collection('questionnaires').doc(req.params.id);
    const doc = await docRef.get();
    if (!doc.exists || doc.data().userId !== uid) {
      return res.status(404).json({ success: false, error: 'Submission not found.' });
    }
    await docRef.delete();
    return res.status(200).json({ success: true, message: 'Questionnaire record deleted.' });
  } catch (err) {
    next(err);
  }
};

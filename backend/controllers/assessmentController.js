const QuestionnaireResponse = require('../models/QuestionnaireResponse');
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
  if (result.errors) {
    return res.status(400).json({ success: false, errors: result.errors });
  }

  return res.status(200).json({
    success: true,
    assessment: evaluateQuestionnaire(result.answers)
  });
};

/**
 * Submit or finalize a Health Questionnaire
 * POST /api/questionnaires or POST /api/assessments
 */
exports.submitQuestionnaire = async (req, res, next) => {
  try {
    const userId = req.session.userId;
    const { answers = {}, currentStep = 6, completionStatus = 'completed' } = req.body;
    const result = getValidatedAnswers(answers);
    if (result.errors) {
      return res.status(400).json({ success: false, errors: result.errors });
    }
    if (!['completed', 'in_progress'].includes(completionStatus)) {
      return res.status(400).json({ success: false, error: 'Invalid questionnaire completion status.' });
    }
    if (!Number.isInteger(Number(currentStep)) || Number(currentStep) < 1 || Number(currentStep) > 6) {
      return res.status(400).json({ success: false, error: 'Current step must be between 1 and 6.' });
    }

    // Server-side recalculation of assessment level - NEVER trust client-supplied assessment level!
    const assessmentResult = evaluateQuestionnaire(result.answers);

    // Create a new submission record in history if completed, or update active draft
    let submission;
    if (completionStatus === 'completed') {
      submission = await QuestionnaireResponse.findOne({ userId, completionStatus: 'in_progress' });
      if (!submission) submission = new QuestionnaireResponse({ userId });
      submission.answers = result.answers;
      submission.currentStep = Number(currentStep);
      submission.completionStatus = 'completed';
      submission.submittedAt = new Date();
      submission.assessment = {
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
        evaluatedAt: new Date()
      };
      await submission.save();
    } else {
      // In-progress draft saving
      submission = await QuestionnaireResponse.findOne({ userId, completionStatus: 'in_progress' });
      if (!submission) {
        submission = new QuestionnaireResponse({
          userId,
          answers,
          currentStep: Number(currentStep) || 1,
          completionStatus: 'in_progress'
        });
      } else {
        submission.answers = { ...submission.answers, ...result.answers };
        submission.currentStep = Number(currentStep) || submission.currentStep;
      }
      await submission.save();
    }

    const statusCode = completionStatus !== 'completed' || req.baseUrl === '/api/assessments' ? 200 : 201;
    return res.status(statusCode).json({
      success: true,
      message: completionStatus === 'completed' ? 'Health questionnaire submitted and evaluated.' : 'Draft saved.',
      submission,
      assessment: assessmentResult,
      // Backward-compatibility aliases
      assessmentResult,
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

/**
 * Save in-progress draft without full validation
 * POST /api/questionnaires/draft
 */
exports.saveDraft = async (req, res, next) => {
  try {
    const userId = req.session.userId;
    const { answers = {}, currentStep = 1 } = req.body;
    const result = getValidatedAnswers(answers);
    if (result.errors) {
      return res.status(400).json({ success: false, errors: result.errors });
    }
    if (!Number.isInteger(Number(currentStep)) || Number(currentStep) < 1 || Number(currentStep) > 6) {
      return res.status(400).json({ success: false, error: 'Current step must be between 1 and 6.' });
    }

    let draft = await QuestionnaireResponse.findOne({ userId, completionStatus: 'in_progress' });
    if (!draft) {
      draft = new QuestionnaireResponse({
        userId,
        answers: result.answers,
        currentStep: Number(currentStep),
        completionStatus: 'in_progress'
      });
    } else {
      draft.answers = { ...draft.answers, ...result.answers };
      draft.currentStep = Number(currentStep);
    }

    await draft.save();

    return res.status(200).json({
      success: true,
      message: 'Draft saved successfully.',
      draft
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get latest submission or draft for user
 * GET /api/questionnaires/latest or GET /api/assessments
 */
exports.getLatest = async (req, res, next) => {
  try {
    const userId = req.session.userId;
    // Get newest completed or in_progress questionnaire
    const latest = await QuestionnaireResponse.findOne({ userId }).sort({ createdAt: -1 });

    let assessment = null;
    if (latest && latest.answers) {
      assessment = evaluateQuestionnaire(latest.answers);
    }

    return res.status(200).json({
      success: true,
      submission: latest,
      assessment,
      // Backward compatibility aliases
      assessmentData: latest,
      summary: assessment ? {
        completionDate: latest.submittedAt ? new Date(latest.submittedAt).toLocaleDateString() : new Date().toLocaleDateString(),
        level: assessment.level,
        levelName: assessment.levelName,
        observations: assessment.explanations,
        disclaimer: assessment.disclaimer
      } : null
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Retrieve questionnaire history list for authenticated user
 * GET /api/questionnaires/history
 */
exports.getHistory = async (req, res, next) => {
  try {
    const userId = req.session.userId;
    const history = await QuestionnaireResponse.find({ userId, completionStatus: 'completed' })
      .sort({ createdAt: -1 })
      .limit(30);

    return res.status(200).json({
      success: true,
      count: history.length,
      history
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Retrieve a specific questionnaire submission by ID
 * GET /api/questionnaires/:id
 */
exports.getById = async (req, res, next) => {
  try {
    const userId = req.session.userId;
    const submission = await QuestionnaireResponse.findOne({ _id: req.params.id, userId });

    if (!submission) {
      return res.status(404).json({
        success: false,
        error: 'Questionnaire submission not found.'
      });
    }

    const assessment = evaluateQuestionnaire(submission.answers);

    return res.status(200).json({
      success: true,
      submission,
      assessment
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get server-generated assessment for specific submission
 * GET /api/questionnaires/:id/assessment
 */
exports.getAssessmentById = async (req, res, next) => {
  try {
    const userId = req.session.userId;
    const submission = await QuestionnaireResponse.findOne({ _id: req.params.id, userId });

    if (!submission) {
      return res.status(404).json({
        success: false,
        error: 'Questionnaire submission not found.'
      });
    }

    // Always recalculate on server
    const assessment = evaluateQuestionnaire(submission.answers);

    return res.status(200).json({
      success: true,
      submissionId: submission._id,
      assessment
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Delete a specific submission belonging to user
 * DELETE /api/questionnaires/:id
 */
exports.deleteById = async (req, res, next) => {
  try {
    const userId = req.session.userId;
    const deleted = await QuestionnaireResponse.findOneAndDelete({ _id: req.params.id, userId });

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Questionnaire submission not found.'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Questionnaire record deleted successfully.'
    });
  } catch (err) {
    next(err);
  }
};

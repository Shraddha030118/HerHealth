const QuestionnaireResponse = require('../models/QuestionnaireResponse');

exports.saveAssessment = async (req, res, next) => {
  try {
    const userId = req.session.userId;
    const { answers, completionStatus = 'in_progress', currentStep = 1 } = req.body;

    let assessment = await QuestionnaireResponse.findOne({ userId });

    if (!assessment) {
      assessment = new QuestionnaireResponse({
        userId,
        answers: answers || {},
        completionStatus,
        currentStep: Number(currentStep),
        submittedAt: completionStatus === 'completed' ? new Date() : undefined
      });
    } else {
      assessment.answers = { ...assessment.answers, ...(answers || {}) };
      assessment.completionStatus = completionStatus;
      assessment.currentStep = Number(currentStep);
      if (completionStatus === 'completed') {
        assessment.submittedAt = new Date();
      }
    }

    await assessment.save();

    // Generate organized summary without diagnostic inference
    const summary = generateSummary(assessment.answers);

    return res.status(200).json({
      success: true,
      message: completionStatus === 'completed' ? 'Health questionnaire completed.' : 'Draft saved.',
      assessment,
      summary
    });
  } catch (err) {
    next(err);
  }
};

exports.getAssessment = async (req, res, next) => {
  try {
    const userId = req.session.userId;
    const assessment = await QuestionnaireResponse.findOne({ userId });

    let summary = null;
    if (assessment && assessment.answers) {
      summary = generateSummary(assessment.answers);
    }

    return res.status(200).json({
      success: true,
      assessment,
      summary
    });
  } catch (err) {
    next(err);
  }
};

exports.updateAssessmentById = async (req, res, next) => {
  try {
    const userId = req.session.userId;
    const { answers, completionStatus, currentStep } = req.body;

    const assessment = await QuestionnaireResponse.findOne({ _id: req.params.id, userId });
    if (!assessment) {
      return res.status(404).json({ success: false, error: 'Assessment not found.' });
    }

    if (answers) assessment.answers = { ...assessment.answers, ...answers };
    if (completionStatus) {
      assessment.completionStatus = completionStatus;
      if (completionStatus === 'completed') assessment.submittedAt = new Date();
    }
    if (currentStep) assessment.currentStep = Number(currentStep);

    await assessment.save();
    const summary = generateSummary(assessment.answers);

    return res.status(200).json({
      success: true,
      assessment,
      summary
    });
  } catch (err) {
    next(err);
  }
};

function generateSummary(answers = {}) {
  // Synthesizes observations objectively without making medical diagnoses
  const observations = [];

  if (answers.typicalCycleLength) {
    const len = Number(answers.typicalCycleLength);
    if (len < 21) {
      observations.push('Reported cycle length is shorter than the standard 21-day range.');
    } else if (len > 35) {
      observations.push('Reported cycle length is longer than the standard 35-day range.');
    } else {
      observations.push(`Reported cycle interval (${len} days) aligns with typical physiological patterns.`);
    }
  }

  if (answers.painSeverity !== undefined) {
    const pain = Number(answers.painSeverity);
    if (pain >= 7) {
      observations.push(`Pain level is rated high (${pain}/10). You reported that discomfort interferes significantly with normal activity.`);
    } else if (pain >= 4) {
      observations.push(`Moderate pain level (${pain}/10) managed with rest or comfort measures.`);
    } else {
      observations.push(`Mild or minimal menstrual pain reported (${pain}/10).`);
    }
  }

  if (answers.commonSymptoms && answers.commonSymptoms.length > 0) {
    observations.push(`Recurring primary symptoms noted: ${answers.commonSymptoms.join(', ')}.`);
  }

  if (answers.bleedingPattern) {
    observations.push(`Bleeding characteristic: ${answers.bleedingPattern}.`);
  }

  if (answers.sleepQuality) {
    observations.push(`Reported sleep during luteal/period days: ${answers.sleepQuality}.`);
  }

  return {
    completionDate: new Date().toLocaleDateString(),
    observations,
    disclaimer: 'This assessment summary synthesizes self-reported patterns for your personal reference and healthcare discussions. It does NOT diagnose medical conditions.'
  };
}

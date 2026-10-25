/**
 * HerHealth AI — Wellness & Hydration Controller (Firebase Firestore)
 */
const { getFirestore } = require('../config/firebase');
const { FieldValue } = require('firebase-admin/firestore');

// Predefined evidence-supported wellness activities catalog
const GUIDED_ACTIVITIES = [
  {
    id: 'yoga-childs-pose', type: 'yoga', name: "Balasana (Child's Pose)",
    durationMinutes: 5, difficulty: 'Gentle / Beginner',
    target: 'Pelvic floor relaxation, lower back decompression',
    instructions: [
      'Kneel on a soft mat with your big toes touching and knees comfortably apart.',
      'Exhale and lower your torso between your thighs.',
      'Extend your arms forward gently on the floor or rest them alongside your torso with palms up.',
      'Rest your forehead on the mat or a folded blanket.',
      'Breathe deeply into your lower back and belly for 3 to 5 minutes.'
    ],
    safetyNote: 'Do not strain your knees. If you feel any sharp knee or hip discomfort, place a pillow under your seat.',
    icon: 'child-pose'
  },
  {
    id: 'yoga-cat-cow', type: 'yoga', name: 'Marjaryasana-Bitilasana (Cat-Cow Stretch)',
    durationMinutes: 6, difficulty: 'Gentle',
    target: 'Spinal mobility, easing menstrual pelvic tension',
    instructions: [
      'Begin on your hands and knees in a tabletop position with wrists under shoulders and knees under hips.',
      'Inhale: Drop your belly toward the mat, lift your chest and gaze gently forward (Cow Pose).',
      'Exhale: Draw your navel toward your spine, gently round your back toward the ceiling and tuck your chin (Cat Pose).',
      'Move fluidly between the two postures for 10-15 slow breath cycles.'
    ],
    safetyNote: 'Avoid overarching your lower back. Keep movements smooth and pain-free.',
    icon: 'cat-cow'
  },
  {
    id: 'breathing-box', type: 'breathing', name: '4-7-8 Parasympathetic Calming Breath',
    durationMinutes: 5, difficulty: 'Easy',
    target: 'Vagus nerve stimulation, lowering heart rate, soothing cramp perception',
    instructions: [
      'Sit comfortably with an upright spine and relax your shoulders.',
      'Close your eyes or maintain a soft downward gaze.',
      'Inhale quietly through your nose for a count of 4.',
      'Hold your breath gently for a count of 7.',
      'Exhale completely through your mouth with a soft whoosh for a count of 8.',
      'Repeat for 4 to 8 cycles.'
    ],
    safetyNote: 'If 7 seconds hold feels uncomfortable, adjust ratio to 4-4-4 box breathing.',
    icon: 'lungs'
  },
  {
    id: 'stretching-seated', type: 'stretching', name: 'Gentle Seated Butterfly & Forward Fold',
    durationMinutes: 7, difficulty: 'Gentle',
    target: 'Inner thigh and groin relief, calming abdominal pressure',
    instructions: [
      'Sit tall with the soles of your feet together and knees falling open to the sides.',
      'Hold your ankles or shins gently.',
      'Inhale to lengthen your spine.',
      'Exhale and fold forward from your hips only as far as comfortable.',
      'Hold for 1 to 2 minutes with slow rhythmic breaths.'
    ],
    safetyNote: 'Place cushions or yoga blocks under your knees for support if your hips feel tight.',
    icon: 'butterfly'
  },
  {
    id: 'walking-mindful', type: 'walking', name: 'Mindful 10-Minute Period Stroll',
    durationMinutes: 10, difficulty: 'Very Gentle',
    target: 'Circulation boost, natural endorphin release, easing lethargy',
    instructions: [
      'Put on comfortable, unrestrictive shoes and loose clothing.',
      'Walk at an easy, unhurried pace outdoors or around your home.',
      'Focus your awareness on the sensation of your feet touching the ground.',
      'Maintain an upright, relaxed posture without rushing.'
    ],
    safetyNote: 'If cramps intensify or you feel sudden fatigue, stop and hydrate.',
    icon: 'walking'
  }
];

const SOUNDSCAPES = [
  { id: 'track-lavender-rain', title: 'Gentle Lavender Rain', mood: 'Deep Rest & Sleep', duration: '15 min loop', audioFreq: 'Pink Noise & Raindrops', description: 'Soft raindrops falling on leaves to quiet mental rumination.' },
  { id: 'track-calm-theta', title: 'Theta Wave Uterine Ease (432Hz)', mood: 'Cramp Soothing & Relaxation', duration: '20 min loop', audioFreq: '432Hz Harmonic Frequency', description: 'Resonant harmonic sound waves correlated with reduced autonomic tension.' },
  { id: 'track-ocean-breeze', title: 'Misty Ocean Tides', mood: 'Stress Relief & Anxiety Ease', duration: '10 min loop', audioFreq: 'Natural Coastal Ocean Waves', description: 'Rhythmic, gentle waves syncing naturally with slow breathing.' }
];

exports.getActivitiesCatalog = (req, res) => {
  return res.status(200).json({ success: true, activities: GUIDED_ACTIVITIES, soundscapes: SOUNDSCAPES });
};

exports.logCompletedActivity = async (req, res, next) => {
  try {
    const uid = req.user.uid;
    const { activityType, activityName, duration, notes } = req.body;

    if (!activityName || !activityType) {
      return res.status(400).json({ success: false, error: 'Activity name and type are required.' });
    }

    const db = getFirestore();
    const data = {
      userId: uid,
      activityType,
      activityName: activityName.trim(),
      duration: Number(duration) || 5,
      notes: notes ? notes.trim() : '',
      completedAt: FieldValue.serverTimestamp()
    };

    const docRef = await db.collection('wellness').add(data);
    return res.status(201).json({
      success: true,
      message: 'Wellness activity logged! Great job taking care of yourself.',
      activity: { id: docRef.id, _id: docRef.id, ...data }
    });
  } catch (err) {
    next(err);
  }
};

exports.getHistory = async (req, res, next) => {
  try {
    const uid = req.user.uid;
    const db = getFirestore();
    const snap = await db.collection('wellness')
      .where('userId', '==', uid)
      .orderBy('completedAt', 'desc')
      .limit(30)
      .get();

    const history = snap.docs.map(d => ({ id: d.id, _id: d.id, ...d.data() }));
    const totalMinutes = history.reduce((acc, curr) => acc + (curr.duration || 0), 0);

    return res.status(200).json({ success: true, count: history.length, totalMinutes, history });
  } catch (err) {
    next(err);
  }
};

// Hydration
exports.getHydration = async (req, res, next) => {
  try {
    const uid = req.user.uid;
    const todayStr = new Date().toISOString().split('T')[0];
    const db = getFirestore();
    const docId = `${uid}_${todayStr}`;
    const docRef = db.collection('hydration').doc(docId);
    const doc = await docRef.get();

    let hydration;
    if (!doc.exists) {
      const newData = { userId: uid, dateString: todayStr, amountMl: 0, goalMl: 2000, glasses: 0, updatedAt: FieldValue.serverTimestamp() };
      await docRef.set(newData);
      hydration = { id: docId, ...newData };
    } else {
      hydration = { id: docId, ...doc.data() };
    }

    return res.status(200).json({ success: true, hydration });
  } catch (err) {
    next(err);
  }
};

exports.updateHydration = async (req, res, next) => {
  try {
    const uid = req.user.uid;
    const { addGlasses = 1, customAmountMl, goalMl } = req.body;
    const todayStr = new Date().toISOString().split('T')[0];
    const db = getFirestore();
    const docId = `${uid}_${todayStr}`;
    const docRef = db.collection('hydration').doc(docId);
    const doc = await docRef.get();

    const current = doc.exists ? doc.data() : { amountMl: 0, glasses: 0, goalMl: 2000 };
    let { amountMl, glasses } = current;

    if (customAmountMl !== undefined) {
      amountMl = Math.max(0, Number(customAmountMl));
      glasses = Math.round(amountMl / 250);
    } else {
      glasses = Math.max(0, glasses + (Number(addGlasses) || 1));
      amountMl = glasses * 250;
    }

    const updates = { userId: uid, dateString: todayStr, amountMl, glasses, updatedAt: FieldValue.serverTimestamp() };
    if (goalMl !== undefined) updates.goalMl = Number(goalMl);

    await docRef.set(updates, { merge: true });

    return res.status(200).json({
      success: true, message: 'Hydration record updated.',
      hydration: { id: docId, ...current, ...updates }
    });
  } catch (err) {
    next(err);
  }
};

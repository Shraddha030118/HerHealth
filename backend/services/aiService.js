/**
 * AI Service
 * Manages conversational menstrual health education.
 * Supports configurable external LLM APIs (OpenAI / Gemini / Anthropic compatible)
 * with an honest, fully transparent educational Demo Mode fallback when no API key is provided.
 */

const SYSTEM_HEALTHCARE_PROMPT = `You are HerHealth AI, a supportive, compassionate, and informative women's menstrual healthcare companion.
Your role:
1. Provide evidence-based, general educational information on menstrual cycles, symptoms, wellness, and nutrition.
2. Maintain a warm, empathetic, and respectful tone.
3. NEVER diagnose any medical disease, illness, or condition.
4. NEVER prescribe medications or unsafe remedies.
5. If a user describes red flag symptoms (severe sudden pain, fainting, bleeding soaking >1 pad/hour, high fever), immediately advise them to seek urgent or emergency medical evaluation.
6. Clearly state that your advice is for educational guidance only and is not a substitute for clinical medical advice from a doctor or gynecologist.`;

const DEMO_RESPONSES = [
  {
    triggers: ['cramp', 'pain', 'dysmenorrhea', 'hurts', 'why do menstrual cramps occur', 'cramping'],
    title: 'Understanding Menstrual Cramps (Dysmenorrhea)',
    response: `Menstrual cramps (dysmenorrhea) primarily occur due to natural hormone-like compounds called prostaglandins.

Key insights:
• Before your period, the cells of your uterine lining produce prostaglandins, which signal the uterine muscles to contract to help shed the lining.
• Higher levels of prostaglandins are correlated with more intense muscle contractions and reduced blood flow to the uterine tissue, triggering pain sensations.
• Prostaglandins can also enter the bloodstream, which is why some women experience mild nausea, diarrhea, or headaches alongside cramps.

Comfort Measures:
1. Gentle Heat: A heating pad or warm bath increases blood circulation and relaxes uterine muscles.
2. Gentle Movement: Child's pose, cat-cow yoga, or a relaxed walk releases natural endorphins.
3. Hydration & Magnesium: Drinking warm water and eating magnesium-rich foods (such as pumpkin seeds or leafy greens) can ease muscle spasms.

When to see a doctor: If your pain is debilitating (score >7/10), interferes with school/work, or doesn't ease with standard rest and care, consult a healthcare professional to check for conditions like endometriosis or fibroids.`
  },
  {
    triggers: ['relax', 'calm', 'stress', 'soothe', 'comfort', 'what can help me relax during my period'],
    title: 'Relaxation & Comfort Strategies',
    response: `Supporting your nervous system during your period helps reduce tension and modulate pain perception. Here are gentle, practical ways to relax:

1. Guided Breathing (4-7-8 Technique):
   • Inhale through your nose for 4 seconds.
   • Hold your breath gently for 7 seconds.
   • Exhale slowly through your mouth for 8 seconds.
   • This activates the parasympathetic nervous system ("rest and digest"). Check our Wellness tab for an interactive session!

2. Gentle Restorative Movement:
   • Restorative yoga poses such as Supported Child's Pose and Supta Baddha Konasana (Reclining Bound Angle) ease pelvic and lower back tension.

3. Soothing Sensory Care:
   • Warm herbal teas like chamomile, ginger, or peppermint soothe gastrointestinal bloating and provide warmth.
   • Listening to soft binaural or ambient frequencies (available in our Wellness module).

Reminder: Be gentle with your body. Lower your expectations for strenuous productivity on high-flow days, and give yourself permission to rest.`
  },
  {
    triggers: ['irregular', 'late', 'missed', 'delay', 'early', 'what may cause an irregular period'],
    title: 'Factors Influencing Cycle Regularity',
    response: `A menstrual cycle is considered regular if it generally arrives every 21 to 35 days. However, natural fluctuations are very common.

Common causes of cycle irregularities include:
• Acute Stress: Elevated cortisol can disrupt the hypothalamic-pituitary-ovarian (HPO) axis, delaying ovulation.
• Sleep & Circadian Shifts: Jet lag, night shifts, or poor sleep can alter melatonin and reproductive hormones.
• Significant Dietary or Weight Shifts: Rapid weight loss, strict calorie restriction, or intense athletic training can temporarily suppress ovulation.
• Polycystic Ovary Syndrome (PCOS): A common hormonal balance affecting how the ovaries release eggs.
• Thyroid Variations: Hypothyroidism or hyperthyroidism directly impacts metabolic and menstrual cycles.
• Contraceptive Changes: Starting, stopping, or switching birth control methods often leads to cycle variation for several months.

Next Step: Track your cycles consistently in HerHealth AI for 2 to 3 months. If your cycle is consistently shorter than 21 days, longer than 38 days, or absent for over 90 days, schedule an evaluation with a gynecologist.`
  },
  {
    triggers: ['doctor', 'physician', 'gynecologist', 'warning', 'emergency', 'what symptoms should i discuss with a doctor'],
    title: 'When to Consult a Healthcare Professional',
    response: `While mild cramping and mood shifts are typical menstrual symptoms, certain signs warrant professional clinical evaluation:

Please discuss these symptoms with a doctor:
1. Extremely Heavy Bleeding: Soaking through one or more sanitary pads or tampons every hour for consecutive hours, passing clots larger than a quarter, or bleeding lasting >7 days.
2. Severe, Incapacitating Pain: Cramps that make normal activities impossible or fail to respond to standard rest and care.
3. Sudden, Severe or One-Sided Pelvic Pain: Could indicate an ovarian cyst rupture or ectopic pregnancy.
4. Bleeding Between Cycles or Post-Intercourse: Any unexplained spotting outside your normal period window.
5. Accompanying Dizziness or Fainting: Feeling faint, lightheaded, or unusually short of breath during bleeding requires prompt emergency evaluation.
6. Persistent Absence of Periods: Missing three or more periods consecutively when not pregnant.

Tip: Use HerHealth AI's 'Doctor-Ready Report' generator to download your recorded period lengths, symptoms, and pain trends to bring directly to your consultation.`
  },
  {
    triggers: ['prepare', 'upcoming', 'next period', 'kit', 'how can i prepare for my next period'],
    title: 'Preparing for Your Upcoming Period',
    response: `Proactive preparation helps you feel confident and comfortable before your period arrives:

1. Stock Your Care Kit:
   • Ensure you have your preferred period products (pads, tampons, menstrual cups, or period underwear) in your bag and at home.
   • Keep pain relief options or a portable heating patch accessible.

2. Nutrition & Hydration:
   • Increase dietary iron (lentils, spinach, beans, fortified grains) and vitamin C to enhance iron absorption.
   • Hydrate well (aim for 2+ liters of water daily) to reduce water retention and bloating.
   • Limit high-sodium and overly processed snacks a few days before your flow to minimize fluid retention.

3. Schedule Breathing & Rest:
   • Check your HerHealth cycle day. During the late luteal phase (3-5 days before menstruation), prioritize restful evenings and avoid over-scheduling intense workouts.

4. Log Early PMS Clues:
   • Keep track of subtle changes in mood, breast tenderness, or sleep quality in your Symptom Tracker.`
  }
];

async function generateChatResponse({ message, conversationHistory = [] }) {
  const apiKey = process.env.AI_API_KEY;
  const provider = process.env.AI_PROVIDER || 'demo';
  const apiUrl = process.env.AI_API_URL || 'https://api.openai.com/v1/chat/completions';
  const model = process.env.AI_MODEL || 'gpt-4o-mini';

  const userQuery = (message || '').trim();

  // Emergency red-flag safety check first (regardless of AI provider)
  const queryLower = userQuery.toLowerCase();
  if (
    queryLower.includes('fainted') ||
    queryLower.includes('passed out') ||
    (queryLower.includes('dizzy') && queryLower.includes('bleeding')) ||
    (queryLower.includes('severe pain') && (queryLower.includes('fever') || queryLower.includes('vomit')))
  ) {
    return {
      text: `⚠️ **IMPORTANT HEALTH ADVISORY: POTENTIALLY URGENT SYMPTOMS**

Based on your message, you mentioned symptoms that could indicate significant blood loss, acute pelvic distress, or another urgent medical concern.

**Immediate Recommendations:**
• Please stop reading this chat and contact emergency medical services or visit the nearest emergency medical facility immediately.
• If you feel faint, sit or lie down immediately with your legs elevated above heart level.
• Inform someone nearby (a family member, friend, or roommate) about how you are feeling right now.
• Do NOT attempt to drive yourself.

HerHealth AI provides educational support only and cannot provide emergency medical care. Your safety is paramount.`,
      isDemoFallback: !apiKey,
      provider: apiKey ? provider : 'safety-triage-rule',
      disclaimer: 'HerHealth AI is an educational companion and does not substitute for emergency medical care.'
    };
  }

  // If no API key or provider is set to demo, use the curated educational knowledge base
  if (!apiKey || provider === 'demo' || apiKey.trim() === '') {
    // Search curated demo responses
    const matched = DEMO_RESPONSES.find(item =>
      item.triggers.some(trigger => queryLower.includes(trigger))
    );

    let answerText = '';
    if (matched) {
      answerText = `**${matched.title}**\n\n${matched.response}`;
    } else {
      answerText = `Thank you for your question about menstrual wellness.

Here are general insights for supporting your menstrual health:
• **Tracking Patterns:** The most effective way to understand recurring symptoms (such as energy fluctuations, cramping, or mood shifts) is by logging them daily in your HerHealth Symptom Tracker.
• **Holistic Care:** Menstrual health is closely linked to restorative sleep, balanced nutrition with iron and magnesium, and nervous system regulation.
• **Personalized Care:** Every individual's hormonal rhythm is unique.

If you have specific concerns regarding severe discomfort, unusual bleeding, or sudden cycle changes, we strongly encourage speaking with a qualified gynecologist or healthcare provider.

*(Tip: You can also ask about cramps, relaxation techniques, irregular cycles, preparing for your period, or when to see a doctor).*`;
    }

    return {
      text: answerText,
      isDemoFallback: true,
      provider: 'educational-demo',
      disclaimer: 'HerHealth AI Educational Demo Mode: No external AI API key is configured in the backend environment. Responses are provided from reviewed clinical educational guidance.'
    };
  }

  // Live external API call
  try {
    const messagesPayload = [
      { role: 'system', content: SYSTEM_HEALTHCARE_PROMPT },
      ...conversationHistory.slice(-4).map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'assistant',
        content: msg.text
      })),
      { role: 'user', content: userQuery }
    ];

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000); // 12s timeout

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model,
        messages: messagesPayload,
        temperature: 0.7,
        max_tokens: 650
      }),
      signal: controller.signal
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`[AI Provider Error] Status: ${response.status}: ${errorBody}`);
      throw new Error(`AI service provider returned status ${response.status}`);
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || 'I could not generate a response at this moment.';

    return {
      text: reply,
      isDemoFallback: false,
      provider: provider,
      disclaimer: 'HerHealth AI provides general health educational information and is not a substitute for professional medical advice, diagnosis, or treatment.'
    };
  } catch (err) {
    console.error(`[AI Service Fallback Triggered]: ${err.message}`);
    // Safe graceful degradation without breaking user experience
    return {
      text: `⚠️ *External AI provider service was temporarily unreachable.*

Here is general educational guidance for your inquiry:
Prostaglandins, hormonal fluctuations (estrogen and progesterone), and autonomic stress levels commonly influence menstrual cycles. Rest, warm heat application, adequate hydration, and balanced nutrient intake are safe supportive practices.

If your symptoms are persistent or severe, please reach out directly to your healthcare provider.`,
      isDemoFallback: true,
      provider: 'educational-demo-fallback',
      disclaimer: 'Educational fallback response. Always consult a healthcare provider for medical concerns.'
    };
  }
}

module.exports = {
  generateChatResponse
};

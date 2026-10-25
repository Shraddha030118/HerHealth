// Nutrition database & recommendations for menstrual wellness
const NUTRITION_DATA = {
  categories: [
    {
      id: 'iron',
      name: 'Iron-Rich Foods',
      subtitle: 'Replenishing blood loss & combating fatigue',
      benefits: 'Helps prevent micro-deficiencies and fatigue caused by monthly menstrual blood loss.',
      foods: [
        {
          name: 'Lentils & Chickpeas',
          serving: '1 cup cooked (~6.6mg iron)',
          tips: 'Pair with Vitamin C (lemon juice, tomatoes) to double plant-based iron absorption.',
          vegetarian: true
        },
        {
          name: 'Dark Leafy Greens (Spinach, Kale)',
          serving: '1 cup cooked (~6.4mg iron)',
          tips: 'Steam lightly rather than boiling to preserve folate and minerals.',
          vegetarian: true
        },
        {
          name: 'Pumpkin & Sesame Seeds',
          serving: '2 tablespoons (~2.5mg iron)',
          tips: 'Sprinkle over morning oatmeal or afternoon yoghurt.',
          vegetarian: true
        },
        {
          name: 'Lean Poultry / Free-Range Eggs',
          serving: '100g (~1.8mg - 2.5mg heme iron)',
          tips: 'Heme iron is easily absorbed by the human body.',
          vegetarian: false
        }
      ]
    },
    {
      id: 'magnesium',
      name: 'Magnesium & Cramp Ease',
      subtitle: 'Relaxing uterine smooth muscle & calming nerves',
      benefits: 'Magnesium acts as a natural calcium channel blocker, helping ease uterine muscle spasms and headaches.',
      foods: [
        {
          name: 'Dark Chocolate (70%+ Cacao)',
          serving: '1-2 squares (~64mg magnesium)',
          tips: 'Rich in polyphenols, satisfying cravings while calming nerves.',
          vegetarian: true
        },
        {
          name: 'Avocado',
          serving: '1 medium avocado (~58mg magnesium)',
          tips: 'Contains healthy monounsaturated fats that support hormone production.',
          vegetarian: true
        },
        {
          name: 'Bananas',
          serving: '1 medium (~32mg magnesium + potassium)',
          tips: 'Helps balance fluid retention and reduce menstrual bloating.',
          vegetarian: true
        }
      ]
    },
    {
      id: 'anti_inflammatory',
      name: 'Anti-Inflammatory & Omega-3s',
      subtitle: 'Lowering prostaglandins & joint aching',
      benefits: 'Competes with inflammatory arachidonic acid, reducing painful uterine prostaglandins.',
      foods: [
        {
          name: 'Wild Salmon & Mackerel',
          serving: '100g fillet',
          tips: 'High in EPA & DHA omega-3 fatty acids for pain modulation.',
          vegetarian: false
        },
        {
          name: 'Chia Seeds & Flaxseeds',
          serving: '1 tablespoon ground',
          tips: 'Must be ground for optimal absorption of lignans and ALA.',
          vegetarian: true
        },
        {
          name: 'Fresh Ginger & Turmeric',
          serving: 'Fresh grated in hot water or meals',
          tips: 'Contains gingerols and curcumin, clinically shown to relieve primary dysmenorrhea.',
          vegetarian: true
        }
      ]
    }
  ],
  meals: {
    breakfast: [
      {
        name: 'Iron & Berry Oatmeal Bowl',
        description: 'Rolled oats cooked with chia seeds, topped with berries, crushed pumpkin seeds, and a touch of blackstrap molasses.',
        type: 'Vegetarian',
        benefit: 'Sustained low-glycemic energy with high bioavailable iron.'
      },
      {
        name: 'Avocado & Poached Egg Whole-Wheat Toast',
        description: 'Two poached eggs over mashed avocado, chili flakes, and sprouted multigrain sourdough bread.',
        type: 'Non-Vegetarian',
        benefit: 'High protein and choline for hormone synthesis.'
      }
    ],
    lunch: [
      {
        name: 'Warm Quinoa, Lentil & Spinach Buddha Bowl',
        description: 'Cooked spiced lentils, fluffy quinoa, steamed spinach, roasted sweet potato, and lemon-tahini drizzle.',
        type: 'Vegetarian',
        benefit: 'Combines iron with vitamin C and complex dietary fiber for bowel regularity.'
      },
      {
        name: 'Wild Salmon Salad with Citrus Vinaigrette',
        description: 'Pan-seared salmon fillet over mixed baby greens, cucumbers, walnuts, and fresh orange segments.',
        type: 'Non-Vegetarian',
        benefit: 'High anti-inflammatory omega-3 content reduces cramp prostaglandins.'
      }
    ],
    snacks: [
      {
        name: 'Dark Chocolate & Almond Energy Clusters',
        description: '85% dark chocolate squares with a small handful of raw almonds and dried cranberries.',
        type: 'Vegetarian',
        benefit: 'Rapid magnesium boost and antioxidant support.'
      },
      {
        name: 'Chamomile-Ginger Brew with Apple Slices',
        description: 'Fresh brewed ginger root tea with cinnamon and crisp apple slices.',
        type: 'Vegetarian',
        benefit: 'Relieves gastrointestinal bloating and calms digestive spasms.'
      }
    ],
    dinner: [
      {
        name: 'Comforting Golden Turmeric Chickpea Stew',
        description: 'Slow-simmered chickpeas in coconut milk, turmeric, ginger, tomatoes, and baby kale over brown rice.',
        type: 'Vegetarian',
        benefit: 'Soothing warm digestion with potent anti-inflammatory curcumin.'
      },
      {
        name: 'Herbed Chicken Breast with Roasted Root Veggies',
        description: 'Rosemary baked chicken breast with beets, carrots, and steamed broccoli spears.',
        type: 'Non-Vegetarian',
        benefit: 'Easily digestible lean protein that supports neurotransmitter recovery.'
      }
    ]
  },
  hydrationGuidance: {
    dailyRecommendedMl: 2200,
    tips: [
      'Warm or room-temperature water is often more comforting for pelvic muscle relaxation than ice-cold drinks.',
      'Sip coconut water on high-flow days to replace potassium, sodium, and magnesium.',
      'Limit excess caffeine and high-fructose sodas during the first 48 hours of flow to avoid vascular constriction.'
    ]
  },
  disclaimer: 'Educational Nutrition Guidance: Dietary habits support overall wellbeing and symptom comfort, but do not replace medical evaluation or treatment for underlying hormonal or pelvic conditions.'
};

exports.getNutritionData = (req, res) => {
  return res.status(200).json({
    success: true,
    data: NUTRITION_DATA
  });
};

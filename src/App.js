import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Home, DollarSign, MessageSquare, X, Calendar, Trash2, Users, Plus, Menu, Sparkles, Dices } from 'lucide-react';
import { supabase, supabaseFetch, supabaseUrl, supabaseAnonKey } from './utils/supabaseClient';
import { TERMS_OF_SERVICE, PRIVACY_POLICY } from './utils/constants';
import HomeScreen from './screens/HomeScreen';
import BottomNav from './components/BottomNav';
import NavBar from './components/NavBar';
import LoginScreen from './screens/LoginScreen';
import SuggestionsScreen from './screens/SuggestionsScreen';
import MealCard from './components/MealCard';
import AdminScreen from './screens/AdminScreen';
import PremiumPopup from './popups/coming_soon_a'; 

const WeekPlannerScreen = ({ user, maxMealBudget, trackActivity, mealHistory }) => {
  const [plannedMeals, setPlannedMeals] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchPlannedMeals = React.useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const query = `?user_id=eq.${user.id}&or=(action_type.eq.plan_meal,action_type.eq.select_meal)&select=*&order=created_at.desc`;
      const data = await supabaseFetch('user_activity', query);
      setPlannedMeals(data || []);
    } catch (err) {
      console.error("Error fetching planned meals:", err);
      setPlannedMeals([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchPlannedMeals();
  }, [fetchPlannedMeals]);

  const removePlannedMeal = async (activityId, mealName) => {
    if (!window.confirm(`Remove ${mealName} from your plan?`)) return;

    try {
      const result = await supabaseFetch('user_activity', `?id=eq.${activityId}`, 'DELETE');

      if (!result || result.length === 0) {
        throw new Error("Permission denied or item not found");
      }

      setPlannedMeals(prev => prev.filter(item => item.id !== activityId));
      trackActivity('remove_planned_meal', { meal_name: mealName });
    } catch (err) {
      console.error("Error removing meal:", err);
      alert("Failed to remove meal: " + err.message);
    }
  };

  const groupedWeeks = React.useMemo(() => {
    const groups = {};
    plannedMeals.forEach(meal => {
      const date = new Date(meal.created_at);
      const day = date.getDay();
      const diff = date.getDate() - day;
      const weekStart = new Date(date);
      weekStart.setDate(diff);
      weekStart.setHours(0, 0, 0, 0);

      const key = weekStart.toISOString();
      if (!groups[key]) {
        groups[key] = {
          startDate: weekStart,
          items: [],
          totalBudget: 0
        };
      }
      groups[key].items.push(meal);
      groups[key].totalBudget += (meal.action_details?.budget || 0);
    });

    return Object.values(groups).sort((a, b) => b.startDate - a.startDate);
  }, [plannedMeals]);

  const mostEatenMeal = React.useMemo(() => {
    if (!mealHistory || mealHistory.length === 0) return null;
    return mealHistory.reduce((prev, current) => (prev.count > current.count) ? prev : current);
  }, [mealHistory]);

  return (
    <div className="pb-24">
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6">
        <h2 className="text-3xl font-bold mb-2">Weekly Eats</h2>
        <p className="opacity-90">See what you eat day to day</p>
      </div>

      <div className="p-4 max-w-4xl mx-auto space-y-8">
        <div className="bg-white rounded-xl shadow p-4 border-l-4 border-green-500 flex justify-between items-center">
          <div>
            <p className="text-gray-500 text-xs uppercase font-bold">All-Time Favorite</p>
            <p className="text-xl font-bold text-green-600">
              {mostEatenMeal ? mostEatenMeal.name : '—'}
            </p>
          </div>
          {mostEatenMeal && (
            <div className="text-right">
              <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-bold">
                {mostEatenMeal.count} times
              </span>
            </div>
          )}
        </div>

        {loading ? (
          <div className="text-center py-10 text-gray-500">Loading history...</div>
        ) : groupedWeeks.length === 0 ? (
          <div className="text-center py-10">
            <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No meals planned yet. Start adding from Home!</p>
          </div>
        ) : (
          groupedWeeks.map((week, idx) => {
            const days = {};
            week.items.forEach(item => {
              const dayDate = new Date(item.created_at).toDateString();
              if (!days[dayDate]) days[dayDate] = [];
              days[dayDate].push(item);
            });

            const sortedDays = Object.keys(days).sort((a, b) => new Date(a) - new Date(b));

            const endDate = new Date(week.startDate);
            endDate.setDate(week.startDate.getDate() + 6);

            return (
              <div key={idx} className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100">
                <div className="bg-gray-50 p-4 border-b flex justify-between items-center">
                  <div className="flex flex-col">
                    <h3 className="font-bold text-gray-800">
                      Week of {week.startDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </h3>
                    <span className="text-xs text-gray-500">
                      To {endDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500 font-bold uppercase">Total Spend</p>
                    <p className="text-lg text-blue-600 font-bold">KSh {week.totalBudget}</p>
                  </div>
                </div>

                <div className="divide-y divide-gray-100">
                  {sortedDays.map(dayKey => (
                    <div key={dayKey} className="flex flex-col sm:flex-row border-b last:border-0 hover:bg-gray-50 transition-colors">
                      <div className="p-4 sm:w-32 bg-gray-50/50 sm:border-r border-gray-100 flex flex-col justify-center">
                        <span className="text-sm font-bold text-gray-700">
                          {new Date(dayKey).toLocaleDateString(undefined, { weekday: 'short' })}
                        </span>
                        <span className="text-xs text-gray-400">
                          {new Date(dayKey).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </span>
                      </div>

                      <div className="flex-1 p-2 space-y-2">
                        {days[dayKey].map(item => (
                          <div key={item.id} className="flex justify-between items-center p-2 bg-white rounded border border-gray-100 shadow-sm">
                            <div className="flex items-center gap-3">
                              <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded w-16 text-center 
                                                        ${item.action_details?.meal_type === 'Breakfast' ? 'bg-orange-100 text-orange-700' :
                                  item.action_details?.meal_type === 'Lunch' ? 'bg-blue-100 text-blue-700' :
                                    item.action_details?.meal_type === 'Dinner' ? 'bg-purple-100 text-purple-700' :
                                      'bg-gray-100 text-gray-600'}`}>
                                {item.action_details?.meal_type || 'Meal'}
                              </span>
                              <div>
                                <p className="font-semibold text-gray-800 text-sm">{item.action_details?.meal_name}</p>
                                <p className="text-xs text-green-600 font-bold">KSh {item.action_details?.budget}</p>
                              </div>
                            </div>
                            <button
                              onClick={() => removePlannedMeal(item.id, item.action_details?.meal_name)}
                              className="text-gray-300 hover:text-red-500 p-2 transition-colors"
                              aria-label="Remove meal"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};



const BudgetScreen = ({ budget, setBudget, trackActivity }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [tempBudget, setTempBudget] = useState(budget);

  const saveBudget = () => {
    const oldBudget = budget;
    setBudget(tempBudget);
    setIsEditing(false);

    trackActivity('change_budget', {
      old_budget: oldBudget,
      new_budget: tempBudget,
      timestamp: new Date().toISOString()
    });
  };

  return (
    <div className="pb-20">
      <div className="bg-gradient-to-r from-green-500 to-emerald-500 text-white p-6">
        <h2 className="text-3xl font-bold mb-2 text-white">Your Budget</h2>
        <p className="opacity-90">Track your meal spending</p>
      </div>

      <div className="p-4 max-w-4xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6 border border-green-100">
          <div className="text-center mb-6">
            <p className="text-gray-600 mb-2">Weekly Budget</p>

            {isEditing ? (
              <div className="flex flex-col items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold text-gray-800">KSh</span>
                  <input
                    type="number"
                    value={tempBudget}
                    onChange={(e) => setTempBudget(Number(e.target.value))}
                    className="text-4xl font-bold text-gray-800 text-center border-2 border-green-500 rounded-lg px-4 py-2 w-56 focus:outline-none"
                    min="1000"
                    max="50000"
                  />
                </div>
                <div className="flex gap-2 mt-3">
                  <button onClick={saveBudget} className="bg-green-500 text-white px-6 py-2 rounded-lg font-bold">
                    Save
                  </button>
                  <button
                    onClick={() => { setTempBudget(budget); setIsEditing(false); }}
                    className="bg-gray-300 text-gray-700 px-6 py-2 rounded-lg font-bold"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <span className="text-5xl font-bold text-gray-800">KSh {budget}</span>
                <button
                  onClick={() => {
                    setTempBudget('');
                    setIsEditing(true);
                  }}
                  className="text-green-600 font-bold hover:underline"
                >
                  ✏️ Edit Budget
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4 text-center">
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-gray-600 text-sm">Daily Average</p>
              <p className="text-2xl font-bold text-blue-600">KSh {isNaN(budget) ? 0 : Math.round(Number(budget) / 7)}</p>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <p className="text-gray-600 text-sm">Per Meal</p>
              <p className="text-2xl font-bold text-purple-600">KSh {isNaN(budget) ? 0 : Math.round(Number(budget) / 21)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4">Budget Tips</h3>
          <ul className="space-y-3">
            <li className="flex items-start gap-2">
              <span className="text-green-500 text-xl font-bold">✓</span>
              <span className="text-gray-700">Shop at local markets for fresh produce at lower prices</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500 text-xl font-bold">✓</span>
              <span className="text-gray-700">Share ingredients with friends to reduce waste and costs</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

const FeedbackScreen = ({ submitFeedback, trackActivity }) => {
  const [feedback, setFeedback] = useState('');

  return (
    <div className="pb-20">
      <div className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white p-6">
        <h2 className="text-3xl font-bold mb-2 text-white">Feedback</h2>
        <p className="opacity-90">Help us improve DishiStudio</p>
      </div>

      <div className="p-4 max-w-4xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-6 border border-blue-50">
          <label className="text-lg font-bold text-gray-800 mb-3 block">
            Share your thoughts
          </label>
          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="What do you think about DishiStudio? Any suggestions?"
            className="w-full p-4 border border-gray-300 rounded-lg mb-4 h-40 resize-none focus:ring-2 focus:ring-blue-500 outline-none"
          />

          <button
            onClick={() => {
              if (feedback.trim()) {
                submitFeedback(feedback);
                setFeedback('');
              }
            }}
            className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 text-white py-3 rounded-lg font-bold hover:shadow-lg transition-all"
          >
            Submit Feedback
          </button>
        </div>
      </div>
    </div>
  );
};

const ProfileScreen = ({ user, handleDeleteAccount, setShowTermsModal, TERMS_OF_SERVICE, PRIVACY_POLICY, onLogout, setCurrentScreen }) => {
  const [showDeleteSection, setShowDeleteSection] = useState(false);

  const ADMIN_EMAILS = [
    'ednahmageria539@gmail.com',
    'austinmuendo2@gmail.com'
  ];
  return (
    <div className="pb-20">
      <div className="bg-gradient-to-r from-purple-500 to-indigo-500 text-white p-6">
        <h2 className="text-3xl font-bold mb-2 text-white">Profile & Settings</h2>
        <p className="opacity-90">Manage your account</p>
      </div>

      <div className="p-4 max-w-4xl mx-auto space-y-4">
        {/* 👑 SECRET ADMIN BUTTON (Now checks the array!) */}
        {ADMIN_EMAILS.includes(user?.email) && (
          <div className="bg-yellow-50 rounded-xl shadow-lg p-6 border-2 border-yellow-400 animate-pulse">
            <h3 className="text-xl font-bold text-yellow-800 mb-2">👑 Admin Controls</h3>
            <p className="text-sm text-yellow-700 mb-4">You have superuser access.</p>
            <button
              onClick={() => setCurrentScreen('admin')}
              className="w-full bg-yellow-500 text-white py-3 rounded-lg font-bold hover:bg-yellow-600 shadow-md"
            >
              Open Admin Dashboard
            </button>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-lg p-6 border border-purple-50">
          <h3 className="text-xl font-bold text-gray-800 mb-4">Account Information</h3>
          <div className="space-y-3">
            <div>
              <p className="text-sm text-gray-600">Name</p>
              <p className="text-lg font-semibold text-gray-800">{user?.name}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Email</p>
              <p className="text-lg font-semibold text-gray-800">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="mt-6 w-full bg-gray-100 text-gray-700 py-2 rounded-lg font-bold hover:bg-gray-200"
          >
            Logout
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
          <h3 className="text-xl font-bold text-gray-800 mb-4">Legal</h3>
          <div className="space-y-2">
            <button
              onClick={() => {
                setShowTermsModal(true);
              }}
              className="w-full text-left p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-all"
            >
              <p className="font-semibold text-gray-800">Terms of Service</p>
              <p className="text-sm text-gray-600">View our terms and conditions</p>
            </button>
            <button
              onClick={() => {
                setShowTermsModal(true);
              }}
              className="w-full text-left p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-all"
            >
              <p className="font-semibold text-gray-800">Privacy Policy</p>
              <p className="text-sm text-gray-600">How we handle your data</p>
            </button>
          </div>
        </div>

        <div className="bg-red-50 rounded-xl shadow-lg p-6 border-2 border-red-200">
          <h3 className="text-xl font-bold text-red-800 mb-2">Danger Zone</h3>
          <p className="text-sm text-red-600 mb-4">These actions cannot be undone</p>

          {!showDeleteSection ? (
            <button
              onClick={() => setShowDeleteSection(true)}
              className="bg-red-500 text-white px-6 py-3 rounded-lg font-bold hover:bg-red-600 transition-all"
            >
              Delete Account
            </button>
          ) : (
            <div className="space-y-3">
              <div className="bg-white p-4 rounded-lg border-2 border-red-300">
                <p className="text-sm text-gray-800 mb-2">
                  <strong>⚠️ Warning:</strong> Deleting your account will:
                </p>
                <ul className="text-sm text-gray-700 space-y-1 ml-4 list-disc">
                  <li>Permanently delete all your data</li>
                  <li>Delete all meal records</li>
                </ul>
                <p className="text-sm text-red-600 font-bold mt-3">
                  This action CANNOT be reversed!
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleDeleteAccount}
                  className="flex-1 bg-red-600 text-white py-3 rounded-lg font-bold hover:bg-red-700 transition-all"
                >
                  Yes, Delete My Account
                </button>
                <button
                  onClick={() => setShowDeleteSection(false)}
                  className="flex-1 bg-gray-300 text-gray-700 py-3 rounded-lg font-bold hover:bg-gray-400 transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const AddMealScreen = ({ user, trackActivity, setCurrentScreen, allMeals }) => {
  const [mealData, setMealData] = useState({
    name: '',
    category: 'Lunch',
    budget: '',
    description: '',
    ingredients: '',
    recipe: '',
    healthScore: 3
  });
  const [mode, setMode] = useState('manual'); // 'manual' or 'auto'
  const [loading, setLoading] = useState(false);

  const handleAutoFill = () => {
    if (!mealData.name) {
      alert("Please enter a meal name first.");
      return;
    }
    setLoading(true);
    // Simulate tool auto-generation
    setTimeout(() => {
      setMealData(prev => ({
        ...prev,
        budget: prev.budget || Math.floor(Math.random() * 200) + 100,
        description: `Delicious ${prev.name} prepared with local ingredients.`,
        ingredients: `Ingredients for ${prev.name}, salt, oil, onions, tomatoes.`,
        recipe: `1. Prepare ingredients.\n2. Cook ${prev.name} over medium heat.\n3. Serve hot and enjoy!`,
        healthScore: 4
      }));
      setLoading(false);
      setMode('manual');
    }, 1500);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!mealData.name || !mealData.budget) {
      alert("Name and budget are required.");
      return;
    }

    // Duplicate check
    const isDuplicate = allMeals.some(m => m.name.toLowerCase() === mealData.name.toLowerCase());
    if (isDuplicate) {
      alert("This meal already exists in the system!");
      return;
    }

    setLoading(true);
    try {
      // Check community meals too
      const communityCheck = await supabaseFetch('community_meals', `?name=ilike.${mealData.name}`);
      if (communityCheck && communityCheck.length > 0) {
        alert("This meal already exists in community suggestions!");
        setLoading(false);
        return;
      }

      const payload = {
        name: mealData.name,
        category: mealData.category,
        budget: Number(mealData.budget),
        description: mealData.description,
        ingredients: mealData.ingredients.split(',').map(i => i.trim()),
        recipe: mealData.recipe,
        health_score: mealData.healthScore,
        user_id: user.id,
        username: user.username,
        created_at: new Date().toISOString()
      };

      await supabaseFetch('community_meals', '', 'POST', payload);
      alert("Meal added to community suggestions!");
      trackActivity('add_community_meal', { meal_name: mealData.name });
      setCurrentScreen('community-suggestions');
    } catch (err) {
      console.error("Failed to add meal:", err);
      alert("Error adding meal: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pb-20">
      <div className="bg-gradient-to-r from-orange-500 to-pink-500 text-white p-6">
        <h2 className="text-3xl font-bold mb-2">Add New Meal</h2>
        <p className="opacity-90">Share your favorite dish with the community</p>
      </div>

      <div className="p-4 max-w-2xl mx-auto">
        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-lg p-6 space-y-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Meal Name</label>
            <input
              type="text"
              value={mealData.name}
              onChange={e => setMealData({ ...mealData, name: e.target.value })}
              className="w-full p-3 border rounded-lg outline-none focus:ring-2 focus:ring-orange-500"
              placeholder="e.g., Pilau"
              required
            />
          </div>

          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => setMode('manual')}
              className={`flex-1 py-2 rounded-lg font-bold transition-all ${mode === 'manual' ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600'}`}
            >
              Manual Entry
            </button>
            <button
              type="button"
              onClick={() => { setMode('auto'); handleAutoFill(); }}
              className={`flex-1 py-2 rounded-lg font-bold transition-all ${mode === 'auto' ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600'}`}
            >
              Auto-generate Details
            </button>
          </div>

          {loading && mode === 'auto' ? (
            <div className="text-center py-4 text-orange-500 font-bold animate-pulse">Tool is generating details...</div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Category</label>
                  <select
                    value={mealData.category}
                    onChange={e => setMealData({ ...mealData, category: e.target.value })}
                    className="w-full p-3 border rounded-lg outline-none"
                  >
                    <option>Breakfast</option>
                    <option>Lunch</option>
                    <option>Dinner</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Average Price (KSh)</label>
                  <input
                    type="number"
                    value={mealData.budget}
                    onChange={e => setMealData({ ...mealData, budget: e.target.value })}
                    className="w-full p-3 border rounded-lg outline-none"
                    placeholder="200"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Ingredients (comma separated)</label>
                <textarea
                  value={mealData.ingredients}
                  onChange={e => setMealData({ ...mealData, ingredients: e.target.value })}
                  className="w-full p-3 border rounded-lg outline-none h-20"
                  placeholder="Ingredient 1, Ingredient 2..."
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Recipe / Instructions</label>
                <textarea
                  value={mealData.recipe}
                  onChange={e => setMealData({ ...mealData, recipe: e.target.value })}
                  className="w-full p-3 border rounded-lg outline-none h-32"
                  placeholder="Step 1: ... Step 2: ..."
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-orange-500 to-pink-500 text-white py-3 rounded-lg font-bold hover:shadow-lg transition-all"
          >
            {loading ? 'Saving...' : 'Add Meal'}
          </button>
        </form>
      </div>
    </div>
  );
};

const CommunitySuggestionsScreen = ({
  user,
  maxMealBudget,
  setMaxMealBudget,
  setViewingRecipe,
  trackActivity,
  setCurrentScreen,
  onSelect
}) => {
  const [communityMeals, setCommunityMeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isEditingBudget, setIsEditingBudget] = useState(false);
  const [tempBudget, setTempBudget] = useState('');

  const fetchCommunityMeals = useCallback(async () => {
    setLoading(true);
    try {
      const data = await supabaseFetch('community_meals', '?order=created_at.desc');
      setCommunityMeals(data || []);
    } catch (err) {
      console.error("Error fetching community meals:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCommunityMeals();
  }, [fetchCommunityMeals]);

  const saveBudget = () => {
    const newBudget = Number(tempBudget);
    if (!newBudget || newBudget < 50) {
      alert("Budget must be at least KSh 50");
      return;
    }
    setMaxMealBudget(newBudget);
    setIsEditingBudget(false);
    trackActivity('change_max_meal_budget', { new_max_budget: newBudget });
  };

  const handleDelete = async (mealId, mealName) => {
    if (!window.confirm(`Delete your suggestion: ${mealName}?`)) return;
    try {
      await supabaseFetch('community_meals', `?id=eq.${mealId}`, 'DELETE');
      setCommunityMeals(prev => prev.filter(m => m.id !== mealId));
      alert("Meal deleted.");
    } catch (err) {
      alert("Failed to delete: " + err.message);
    }
  };

  const filtered = communityMeals.filter(m => m.budget <= maxMealBudget);

  return (
    <div className="pb-20">
      <div className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white p-6">
        <h2 className="text-2xl font-bold mb-2">Community Suggestions</h2>
        <p className="text-base opacity-90">Meals shared by other Dishi members</p>
      </div>

      <div className="p-4 max-w-6xl mx-auto">

        {/* Budget editor */}
        <div className="bg-white rounded-xl shadow-md p-5 mb-5 border border-blue-100">
          <label className="text-sm font-bold text-gray-700 uppercase tracking-wide block mb-3">
            Max Meal Budget
          </label>
          {isEditingBudget ? (
            <div className="flex items-center gap-3">
              <span className="text-xl font-bold text-gray-700">KSh</span>
              <input
                type="number"
                value={tempBudget}
                onChange={e => setTempBudget(e.target.value)}
                placeholder={maxMealBudget.toString()}
                className="text-xl font-bold text-blue-600 border-2 border-blue-500 rounded-lg px-3 py-2 w-32 focus:outline-none"
                min="50"
                onFocus={e => e.target.select()}
                autoFocus
              />
              <button
                onClick={saveBudget}
                className="bg-blue-500 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-600"
              >
                Save
              </button>
              <button
                onClick={() => { setTempBudget(''); setIsEditingBudget(false); }}
                className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-semibold"
              >
                Cancel
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <span className="text-3xl font-bold text-blue-600">KSh {maxMealBudget}</span>
              <button
                onClick={() => { setTempBudget(''); setIsEditingBudget(true); }}
                className="text-blue-500 hover:text-blue-700 font-semibold text-sm"
              >
                ✏️ Edit
              </button>
              <span className="ml-auto text-sm text-gray-400 font-medium">
                {filtered.length} meal{filtered.length !== 1 ? 's' : ''} in budget
              </span>
            </div>
          )}
        </div>

        <button
          onClick={() => setCurrentScreen('add-meal')}
          className="mb-5 w-full bg-white border-2 border-dashed border-blue-400 text-blue-500 py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-blue-50"
        >
          <Plus className="w-6 h-6" /> Add Your Own Meal
        </button>

        {loading ? (
          <div className="text-center py-10 text-gray-500">Loading community meals...</div>
        ) : communityMeals.length === 0 ? (
          <div className="text-center py-10 bg-white rounded-xl shadow">
            <p className="text-gray-500">No community meals yet. Be the first to add one!</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-10 bg-white rounded-xl shadow">
            <p className="text-gray-600 font-semibold mb-1">No meals within KSh {maxMealBudget}</p>
            <p className="text-gray-400 text-sm">Try increasing your budget above to see more options.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {filtered.map(meal => (
              <MealCard
                key={meal.id}
                meal={meal}
                user={user}
                setViewingRecipe={setViewingRecipe}
                trackActivity={trackActivity}
                onDelete={meal.user_id === user?.id ? handleDelete : null}
                setCurrentScreen={setCurrentScreen}
                onSelect={onSelect}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};


const ResetPasswordScreen = ({ onSuccess }) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);

  const handleReset = async () => {
    if (!newPassword || newPassword.length < 8) {
      alert("Password must be at least 8 characters");
      return;
    }
    if (newPassword !== confirm) {
      alert("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      // Supabase knows who you are from the email link! Just update it.
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      // Sign out of the temporary recovery session for security
      await supabase.auth.signOut();

      alert("Password updated! Please log in with your new password.");
      onSuccess();
    } catch (err) {
      alert("Error updating password: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 to-pink-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md border border-orange-100">
        <h2 className="text-3xl font-bold text-gray-800 mb-2 text-center">Set New Password</h2>
        <p className="text-center text-gray-500 mb-6 text-sm">Choose a strong password for your account</p>

        <div className="mb-4">
          <label className="block text-sm font-semibold text-gray-700 mb-2">New Password</label>
          <div className="relative">
            <input
              type={showPw ? "text" : "password"}
              placeholder="Min. 8 characters"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              className="w-full p-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
            />
            <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">
              {showPw ? '👁️' : '🙈'}
            </button>
          </div>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-700 mb-2">Confirm Password</label>
          <input
            type="password"
            placeholder="Repeat your password"
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
          />
        </div>

        <button
          onClick={handleReset}
          disabled={loading}
          className="w-full bg-gradient-to-r from-orange-500 to-pink-500 text-white py-3 rounded-lg font-semibold hover:shadow-lg transition-all"
        >
          {loading ? 'Updating...' : 'Update Password'}
        </button>
      </div>
    </div>
  );
};

const RecommendationsScreen = ({ allMeals, mealHistory, maxMealBudget, setViewingRecipe, trackActivity, setCurrentScreen, onSelect, user }) => {
  const [topCategory, setTopCategory] = useState(null);
  const [recommendedMeals, setRecommendedMeals] = useState([]);

  React.useEffect(() => {
    // 1. Safety check: If they have no history yet, just show them affordable healthy meals
    if (!mealHistory || mealHistory.length === 0) {
      const healthyPicks = allMeals.filter(m => m.budget <= maxMealBudget && (m.health_score >= 4 || m.healthScore >= 4));
      setRecommendedMeals(healthyPicks.slice(0, 4));
      setTopCategory("Healthy Choices");
      return;
    }

    // 2. Figure out their favorite category based on what they've logged
    const categoryCounts = {};
    mealHistory.forEach(historyItem => {
      const mealDetails = allMeals.find(m => m.id === historyItem.id);
      if (mealDetails && mealDetails.category) {
        categoryCounts[mealDetails.category] = (categoryCounts[mealDetails.category] || 0) + historyItem.count;
      }
    });

    let favorite = null;
    let maxCount = 0;
    for (const [cat, count] of Object.entries(categoryCounts)) {
      if (count > maxCount) { maxCount = count; favorite = cat; }
    }

    // 3. Find meals in that category they HAVEN'T eaten yet
    if (favorite) {
      setTopCategory(favorite);
      const historyIds = mealHistory.map(h => h.id);
      const suggestions = allMeals.filter(m =>
        m.category === favorite &&
        m.budget <= maxMealBudget &&
        !historyIds.includes(m.id)
      );

      // If they've eaten everything in that category, just show the category generally
      if (suggestions.length === 0) {
        const fallbackSuggestions = allMeals.filter(m => m.category === favorite && m.budget <= maxMealBudget);
        setRecommendedMeals(fallbackSuggestions.slice(0, 4));
      } else {
        setRecommendedMeals(suggestions.slice(0, 4));
      }
    }
  }, [mealHistory, allMeals, maxMealBudget]);

  // THE ROULETTE LOGIC
  const handleSurpriseMe = () => {
    const affordableMeals = allMeals.filter(m => m.budget <= maxMealBudget);
    if (affordableMeals.length === 0) {
      alert("No meals found under your current budget! Try increasing your max meal budget.");
      return;
    }
    const randomIndex = Math.floor(Math.random() * affordableMeals.length);
    const randomMeal = affordableMeals[randomIndex];

    setViewingRecipe(randomMeal);
    trackActivity('surprise_me_clicked', { meal_shown: randomMeal.name });
  };

  return (
    <div className="pb-24">
      <div className="bg-gradient-to-r from-purple-600 to-fuchsia-500 text-white p-6 shadow-md">
        <h2 className="text-3xl font-bold mb-2">For You</h2>
        <p className="opacity-90">Personalized picks & lucky rolls</p>
      </div>

      <div className="p-4 max-w-4xl mx-auto space-y-8">

        {/* FEATURE 1: HABIT MATCHING */}
        <div className="bg-white rounded-xl shadow-lg p-6 border border-purple-50">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="text-purple-500 w-6 h-6" />
            <h3 className="text-xl font-bold text-gray-800">
              {topCategory === "Healthy Choices" ? "Healthy Choices For You" : `Because you love ${topCategory}...`}
            </h3>
          </div>

          {recommendedMeals.length === 0 ? (
            <p className="text-gray-500 text-sm">We need a bit more data! Keep saving meals to get personalized recommendations.</p>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {recommendedMeals.map(meal => (
                <MealCard
                  key={meal.id}
                  meal={meal}
                  user={user}
                  setViewingRecipe={setViewingRecipe}
                  trackActivity={trackActivity}
                  setCurrentScreen={setCurrentScreen}
                  onSelect={onSelect}
                />
              ))}
            </div>
          )}
        </div>

        {/* FEATURE 3: THE ROULETTE */}
        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg p-8 text-center text-white relative overflow-hidden">
          <h3 className="text-3xl font-bold mb-3 relative z-10">Can't Decide?</h3>
          <p className="mb-6 opacity-90 relative z-10">Let fate pick a meal under KSh {maxMealBudget} for you right now.</p>

          <button
            onClick={handleSurpriseMe}
            className="bg-white text-purple-600 px-8 py-4 rounded-full font-bold text-lg shadow-[0_0_15px_rgba(255,255,255,0.4)] hover:shadow-[0_0_25px_rgba(255,255,255,0.6)] hover:scale-105 transition-all relative z-10 flex items-center justify-center gap-2 mx-auto"
          >
            <Dices className="w-6 h-6" /> Roll the Dice
          </button>
        </div>

      </div>
    </div>
  );
};

const DiscoveryModal = ({ isOpen, onClose, setCurrentScreen }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-6 relative animate-fade-in-up">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 bg-gray-100 rounded-full p-1"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-2xl font-bold text-gray-800 mb-2 text-center mt-2">Discover Meals</h2>
        <p className="text-center text-gray-500 text-sm mb-6">Where would you like to explore?</p>

        <div className="space-y-4">
          {/* OPTION 1: FOR YOU */}
          <button
            onClick={() => {
              setCurrentScreen('recommendations');
              onClose();
            }}
            className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-purple-100 hover:border-purple-400 hover:bg-purple-50 transition-all text-left group"
          >
            <div className="bg-purple-100 p-3 rounded-full text-purple-600 group-hover:scale-110 transition-transform">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-gray-800 text-lg group-hover:text-purple-700 transition-colors">For You</h3>
              <p className="text-xs text-gray-500 mt-1">Personalized picks & lucky rolls</p>
            </div>
          </button>

          {/* OPTION 2: COMMUNITY */}
          <button
            onClick={() => {
              setCurrentScreen('community-suggestions');
              onClose();
            }}
            className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-blue-100 hover:border-blue-400 hover:bg-blue-50 transition-all text-left group"
          >
            <div className="bg-blue-100 p-3 rounded-full text-blue-600 group-hover:scale-110 transition-transform">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-gray-800 text-lg group-hover:text-blue-700 transition-colors">Community</h3>
              <p className="text-xs text-gray-500 mt-1">Meals shared by the Dishi family</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

const MealPlannerApp = () => {
  const [currentScreen, setCurrentScreen] = useState('home');
  const [showDiscoveryModal, setShowDiscoveryModal] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null);
  //const searchRef = useRef(null); 

  useEffect(() => {
    // Restore persisted login
    const storedUser = localStorage.getItem('dishiUser');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
      setIsLoggedIn(true);
      setCurrentScreen('suggestions');
    }

    // Listen for Supabase auth events — this is the reliable way
    // to catch PASSWORD_RECOVERY before the token disappears
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        // Supabase has validated the token and the session is now live
        // Navigate to the reset screen immediately
        setIsLoggedIn(false);
        setCurrentScreen('reset-password');
      }
    });

    return () => subscription.unsubscribe();
  }, []);


  const [allMeals, setAllMeals] = useState([]);
  const [mealsLoading, setMealsLoading] = useState(true);

  useEffect(() => {
    const fetchAllMeals = async () => {
      setMealsLoading(true);
      try {
        // Fetch all meals from your new Supabase table, ordered by ID
        const data = await supabaseFetch('meals', '?select=*&order=id.asc');
        if (data) {
          setAllMeals(data); // Put the database data into your React state!
        }
      } catch (err) {
        console.error("Error fetching meals from Supabase:", err);
      } finally {
        setMealsLoading(false);
      }
    };

    fetchAllMeals();
  }, []); // The empty array [] means this fetch happens exactly once when the app opens
  const [budget, setBudget] = useState(5000);
  const [maxMealBudget, setMaxMealBudget] = useState(250);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [viewingRecipe, setViewingRecipe] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [mealHistory, setMealHistory] = useState([]);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [loading, setLoading] = useState(false);


  const filteredMeals = allMeals.filter(meal => {
    const withinBudget = meal.budget <= maxMealBudget;
    const matchesCategory = selectedCategory === 'All' || meal.category === selectedCategory;
    const matchesSearch = searchQuery === '' ||
      meal.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      meal.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      meal.ingredients.some(ing => ing.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (meal.culturalNote && meal.culturalNote.toLowerCase().includes(searchQuery.toLowerCase()));
    return withinBudget && matchesCategory && matchesSearch;
  });

  const trackMeal = (meal) => {
    const existingMeal = mealHistory.find(m => m.id === meal.id);
    if (existingMeal) {
      setMealHistory(mealHistory.map(m =>
        m.id === meal.id
          ? { ...m, count: m.count + 1, lastTaken: new Date().toISOString() }
          : m
      ));
      trackActivity('repeat_meal', {
        meal_name: meal.name,
        meal_id: meal.id,
        times_taken: existingMeal.count + 1,
        timestamp: new Date().toISOString()
      });
    } else {
      setMealHistory([...mealHistory, {
        id: meal.id,
        name: meal.name,
        count: 1,
        lastTaken: new Date().toISOString()
      }]);
      trackActivity('new_meal', {
        meal_name: meal.name,
        meal_id: meal.id,
        timestamp: new Date().toISOString()
      });
    }
  };

  const handleLogin = async (email, password) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password,
      });
      if (error) throw error;
      if (data?.user) {
        const { data: profile } = await supabase
          .from('users')
          .select('*')
          .eq('id', data.user.id)
          .single();
        const userData = {
          id: data.user.id,
          email: data.user.email,
          username: profile?.username || data.user.email,
          name: profile?.full_name || 'Dishi Member'
        };
        localStorage.setItem('dishiUser', JSON.stringify(userData));
        setUser(userData);
        setIsLoggedIn(true);
        setCurrentScreen('suggestions');
        await checkTermsAcceptance(data.user.id);
      }
    } catch (error) {
      alert("Login failed: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('dishiUser');
    setUser(null);
    setIsLoggedIn(false);
    setCurrentScreen('home');
  };

  const handleRegister = async (name, email, password, username, setIsRegistering) => {
    if (!name || !email || !password || !username) {
      alert("Please fill in all fields");
      return;
    }
    if (password.length < 8) {
      alert("Password must be at least 8 characters");
      return;
    }
    setLoading(true);
    try {
      const { error: authError } = await supabase.auth.signUp({
        email: email,
        password: password,
        options: { data: { full_name: name, user_name: username } }
      });
      if (authError) throw authError;
      alert("Registration successful! You can now log in.");
      if (setIsRegistering) setIsRegistering(false);
    } catch (error) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  const trackActivity = async (action, details = {}) => {
    if (!user?.id || !user?.email) return;
    try {
      const payload = {
        user_id: user.id,
        user_email: user.email,
        action_type: action,
        action_details: details,
        created_at: new Date().toISOString()
      };
      await supabaseFetch('user_activity', '', 'POST', payload);
    } catch (error) {
      console.error("Activity tracking error:", error);
    }
  };

  const checkTermsAcceptance = async (userId) => {
    if (!userId) return;
    try {
      const { data } = await supabase.from('terms_acceptances').select('*').eq('user_id', userId);
      if (!data || data.length === 0) setShowTermsModal(true);
    } catch (err) {
      console.error("Terms check crashed:", err);
    }
  };

  const handleAcceptTerms = async () => {
    if (!user?.id) return;
    try {
      await supabase.from('terms_acceptances').insert([{
        user_id: user.id,
        user_email: user.email,
        accepted: true,
        terms_version: '1.0',
        accepted_at: new Date().toISOString()
      }]);
      setShowTermsModal(false);
    } catch (error) {
      console.error("DB Update Crashed:", error);
    }
  };

  const handleForgotPassword = async (email) => {
    if (!email) {
      alert("Please enter your email address first.");
      return;
    }
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'https://dishistudio.co.ke'
      });
      if (error) throw error;
      alert("Check your email! A password reset link has been sent.");
    } catch (err) {
      alert("Error: " + err.message);
    }
  };


  const handleDeleteAccount = async () => {
    if (!user?.id) return;
    const confirmDelete = window.confirm("Are you sure you want to delete your account? This cannot be undone.");
    if (!confirmDelete) return;
    const confirmText = window.prompt("Type DELETE to confirm:");
    if (confirmText !== "DELETE") return;
    try {
      setLoading(true);
      await supabaseFetch('users', `?id=eq.${user.id}`, 'DELETE');
      localStorage.removeItem('dishiUser');
      setUser(null);
      setIsLoggedIn(false);
      setCurrentScreen('home');
      alert("Account deleted.");
    } catch (error) {
      alert("Failed to delete account: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const RecipeModal = () => {
    if (!viewingRecipe) return null;
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="sticky top-0 bg-gradient-to-r from-orange-500 to-pink-500 text-white p-6 flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold mb-2">{viewingRecipe.name}</h2>
              <span className="bg-white bg-opacity-20 px-3 py-1 rounded-full text-sm">{viewingRecipe.category}</span>
            </div>
            <button onClick={() => setViewingRecipe(null)} className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2 transition-all">
              <X className="w-6 h-6" />
            </button>
          </div>
          <div className="p-6">
            {viewingRecipe.description && <div className="mb-6"><p className="text-gray-700 text-lg">{viewingRecipe.description}</p></div>}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <div><h3 className="text-sm font-bold text-gray-600 mb-1">Budget</h3><span className="bg-green-100 text-green-800 px-4 py-2 rounded-full font-bold text-lg">KSh {viewingRecipe.budget}</span></div>
                <div className="text-right"><h3 className="text-sm font-bold text-gray-600 mb-1">Health Score</h3><div className="flex items-center gap-1">{[...Array(5)].map((_, i) => (<span key={i} className="text-2xl">{i < viewingRecipe.healthScore ? '⭐' : '☆'}</span>))}</div></div>
              </div>
            </div>
            <div className="mb-6">
              <h3 className="text-lg font-bold text-gray-800 mb-3">Ingredients</h3>
              <ul className="space-y-2">
                {viewingRecipe.ingredients?.map((ing, i) => (<li key={i} className="flex items-center gap-2 text-gray-700"><span className="text-orange-500">•</span>{ing}</li>))}
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-800 mb-3">Recipe</h3>
              <p className="text-gray-700 whitespace-pre-line leading-relaxed">{viewingRecipe.recipe}</p>
            </div>

          </div>
        </div>
      </div>
    );
  };

  const TermsModal = ({ isOpen, onAccept }) => {
    const [viewingPolicy, setViewingPolicy] = useState(false);
    if (!isOpen) return null;
    return (
      <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
          <div className="bg-gradient-to-r from-orange-500 to-pink-500 text-white p-6">
            <h2 className="text-2xl font-bold mb-2">{viewingPolicy ? 'Privacy Policy' : 'Terms of Service'}</h2>
            <p className="text-sm opacity-90">Please read and accept to continue using DishiStudio</p>
          </div>
          <div className="flex-1 overflow-y-auto p-6"><pre className="whitespace-pre-wrap font-sans text-sm text-gray-700 leading-relaxed">{viewingPolicy ? PRIVACY_POLICY : TERMS_OF_SERVICE}</pre></div>
          <div className="border-t p-6 bg-gray-50">
            <div className="flex flex-col gap-3">
              <button onClick={() => setViewingPolicy(!viewingPolicy)} className="text-sm text-orange-600 hover:text-orange-700 font-semibold">{viewingPolicy ? '← Back to Terms of Service' : 'View Privacy Policy →'}</button>
              <div className="flex gap-3">
                <button onClick={onAccept} className="flex-1 bg-gradient-to-r from-orange-500 to-pink-500 text-white py-3 rounded-lg font-bold hover:shadow-lg transition-all">✓ I Accept Terms & Privacy Policy</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {!isLoggedIn && currentScreen === 'home' && <HomeScreen setCurrentScreen={setCurrentScreen} />}
      {!isLoggedIn && currentScreen === 'login' &&
        <LoginScreen
          handleLogin={handleLogin}
          handleRegister={handleRegister}
          handleForgotPassword={handleForgotPassword}
          loading={loading}
        />}
      {currentScreen === 'reset-password' && (
        <ResetPasswordScreen
          onSuccess={() => setCurrentScreen('login')}
        />
      )}
      {isLoggedIn && (
        <>
          <NavBar
            isLoggedIn={isLoggedIn}
            user={user}
            handleLogout={handleLogout}
            setCurrentScreen={setCurrentScreen}
            setShowDiscoveryModal={setShowDiscoveryModal}
          />
          <main className="flex-1 overflow-y-auto pb-20">
            {currentScreen === 'suggestions' && (
              <SuggestionsScreen user={user} maxMealBudget={maxMealBudget} setMaxMealBudget={setMaxMealBudget} selectedCategory={selectedCategory} setSelectedCategory={setSelectedCategory} searchQuery={searchQuery} setSearchQuery={setSearchQuery} filteredMeals={filteredMeals} setViewingRecipe={setViewingRecipe} selectMeal={trackMeal} setCurrentScreen={setCurrentScreen} trackActivity={trackActivity} />
            )}
            {currentScreen === 'budget' && <BudgetScreen budget={budget} setBudget={setBudget} trackActivity={trackActivity} />}
            {currentScreen === 'week-planner' && <WeekPlannerScreen user={user} maxMealBudget={maxMealBudget} trackActivity={trackActivity} mealHistory={mealHistory} />}
            {currentScreen === 'feedback' && <FeedbackScreen submitFeedback={async (t) => { await supabaseFetch('feedback', '', 'POST', { feedback_text: t, user_email: user.email, user_id: user.id, created_at: new Date().toISOString() }); alert("Thanks!"); }} trackActivity={trackActivity} />}
            {currentScreen === 'profile' && <ProfileScreen user={user} handleDeleteAccount={handleDeleteAccount} setShowTermsModal={setShowTermsModal} TERMS_OF_SERVICE={TERMS_OF_SERVICE} PRIVACY_POLICY={PRIVACY_POLICY} onLogout={handleLogout} setCurrentScreen={setCurrentScreen} />}
            {currentScreen === 'community-suggestions' &&
              <CommunitySuggestionsScreen
                user={user}
                maxMealBudget={maxMealBudget}
                setMaxMealBudget={setMaxMealBudget}
                setViewingRecipe={setViewingRecipe}
                trackActivity={trackActivity}
                setCurrentScreen={setCurrentScreen}
                onSelect={trackMeal} />}
            {currentScreen === 'add-meal' &&
              <AddMealScreen
                user={user}
                trackActivity={trackActivity}
                setCurrentScreen={setCurrentScreen}
                allMeals={allMeals}
              />}

            {currentScreen === 'admin' && (
              <AdminScreen
                user={user}
                allMeals={allMeals}
                setAllMeals={setAllMeals}
                setCurrentScreen={setCurrentScreen}
              />
            )}

            {currentScreen === 'recommendations' &&
              <RecommendationsScreen
                allMeals={allMeals}
                mealHistory={mealHistory}
                maxMealBudget={maxMealBudget}
                setViewingRecipe={setViewingRecipe}
                trackActivity={trackActivity}
                setCurrentScreen={setCurrentScreen}
                onSelect={trackMeal}
                user={user} />}
          </main>

          <BottomNav setCurrentScreen={setCurrentScreen} trackActivity={trackActivity} />
          <RecipeModal />
          <PremiumPopup
  userId={user?.id}
  username={user?.name || user?.email}  
/>
          <TermsModal isOpen={showTermsModal} onAccept={handleAcceptTerms} />
          <DiscoveryModal
            isOpen={showDiscoveryModal}
            onClose={() => setShowDiscoveryModal(false)}
            setCurrentScreen={setCurrentScreen}
          />
        </>
      )}
    </div>
  );
};


export default MealPlannerApp;
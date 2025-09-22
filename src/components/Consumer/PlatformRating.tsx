import React, { useState, useEffect } from 'react';
import { Star, Send, MessageSquare, TrendingUp, Users, Award } from 'lucide-react';
import supabaseService from '../../services/supabaseService';
import { useAuth } from '../../hooks/useAuth';

const PlatformRating: React.FC = () => {
  const { user } = useAuth();
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [hoveredRating, setHoveredRating] = useState(0);

  useEffect(() => {
    fetchRatingStats();
  }, []);

  const fetchRatingStats = async () => {
    try {
      const ratingStats = await supabaseService.getRatingStats();
      setStats(ratingStats);
    } catch (error) {
      console.error('Error fetching rating stats:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) return;

    setLoading(true);
    try {
      await supabaseService.submitRating(rating, feedback, user?.address);
      setSuccess(true);
      setRating(0);
      setFeedback('');
      
      // Refresh stats
      await fetchRatingStats();
      
      // Reset success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      console.error('Error submitting rating:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderStars = (currentRating: number, interactive: boolean = false) => {
    return Array.from({ length: 5 }, (_, index) => {
      const starValue = index + 1;
      const isActive = starValue <= (interactive ? (hoveredRating || rating) : currentRating);
      
      return (
        <button
          key={index}
          type={interactive ? "button" : undefined}
          onClick={interactive ? () => setRating(starValue) : undefined}
          onMouseEnter={interactive ? () => setHoveredRating(starValue) : undefined}
          onMouseLeave={interactive ? () => setHoveredRating(0) : undefined}
          className={`${interactive ? 'cursor-pointer hover:scale-110' : 'cursor-default'} transition-all duration-200`}
          disabled={!interactive}
        >
          <Star
            className={`h-8 w-8 ${
              isActive 
                ? 'text-yellow-400 fill-yellow-400' 
                : 'text-gray-300'
            }`}
          />
        </button>
      );
    });
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-xl shadow-lg p-8">
        <div className="flex items-center space-x-3 mb-8">
          <div className="p-3 bg-gradient-to-r from-yellow-500 to-orange-600 rounded-lg">
            <Star className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-yellow-800">Platform Rating</h2>
            <p className="text-yellow-600">Share your experience with HerbionYX</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Rating Form */}
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg p-6 border border-yellow-200">
              <h3 className="text-lg font-semibold text-yellow-800 mb-4">Rate Your Experience</h3>
              
              {success && (
                <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-green-700 font-medium">Thank you for your feedback!</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-yellow-700 mb-2">
                    Overall Rating *
                  </label>
                  <div className="flex items-center space-x-1">
                    {renderStars(rating, true)}
                  </div>
                  <p className="text-xs text-yellow-600 mt-1">
                    {rating === 0 && 'Click to rate'}
                    {rating === 1 && 'Poor'}
                    {rating === 2 && 'Fair'}
                    {rating === 3 && 'Good'}
                    {rating === 4 && 'Very Good'}
                    {rating === 5 && 'Excellent'}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-yellow-700 mb-2">
                    Feedback (Optional)
                  </label>
                  <textarea
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    rows={4}
                    placeholder="Tell us about your experience with the HerbionYX platform..."
                    className="w-full px-3 py-2 border border-yellow-200 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={rating === 0 || loading}
                  className="w-full bg-gradient-to-r from-yellow-500 to-orange-600 text-white py-3 px-4 rounded-lg hover:from-yellow-600 hover:to-orange-700 transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <>
                      <Send className="h-5 w-5" />
                      <span>Submit Rating</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>

          {/* Rating Statistics */}
          <div className="space-y-6">
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                <TrendingUp className="h-5 w-5 mr-2 text-blue-600" />
                Platform Statistics
              </h3>

              {stats ? (
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="flex items-center justify-center space-x-1 mb-2">
                      {renderStars(Math.round(stats.averageRating))}
                    </div>
                    <div className="text-3xl font-bold text-gray-900">{stats.averageRating}</div>
                    <div className="text-sm text-gray-600">Average Rating</div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-blue-50 rounded-lg p-4 text-center">
                      <div className="flex items-center justify-center mb-2">
                        <Users className="h-6 w-6 text-blue-600" />
                      </div>
                      <div className="text-2xl font-bold text-blue-800">{stats.totalReviews}</div>
                      <div className="text-sm text-blue-600">Total Reviews</div>
                    </div>

                    <div className="bg-green-50 rounded-lg p-4 text-center">
                      <div className="flex items-center justify-center mb-2">
                        <Award className="h-6 w-6 text-green-600" />
                      </div>
                      <div className="text-2xl font-bold text-green-800">{stats.satisfactionRate}%</div>
                      <div className="text-sm text-green-600">Satisfaction Rate</div>
                    </div>
                  </div>

                  <div className="text-xs text-gray-500 text-center">
                    Based on ratings of 4 stars and above
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading statistics...</p>
                </div>
              )}
            </div>

            {/* Features Feedback */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-200">
              <h3 className="text-lg font-semibold text-blue-800 mb-4 flex items-center">
                <MessageSquare className="h-5 w-5 mr-2" />
                What We Value
              </h3>
              <div className="space-y-3 text-sm text-blue-700">
                <div className="flex items-start space-x-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                  <span>Ease of use and navigation</span>
                </div>
                <div className="flex items-start space-x-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                  <span>Accuracy of traceability information</span>
                </div>
                <div className="flex items-start space-x-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                  <span>Speed and reliability of QR scanning</span>
                </div>
                <div className="flex items-start space-x-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                  <span>Overall trust in the platform</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlatformRating;
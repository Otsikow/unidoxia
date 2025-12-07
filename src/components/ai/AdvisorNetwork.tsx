import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import { Textarea } from '@/components/ui/textarea';
import { 
  Users, 
  Search, 
  Filter, 
  Star, 
  MapPin, 
  Clock, 
  MessageCircle, 
  Video, 
  Phone,
  Calendar as CalendarIcon,
  CheckCircle,
  Globe,
  Award,
  BookOpen
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Advisor {
  id: string;
  name: string;
  title: string;
  bio: string;
  languages: string[];
  countries: string[];
  specializations: string[];
  rating: number;
  reviewCount: number;
  experience: number;
  avatar_url?: string;
  availability: {
    timezone: string;
    available_days: string[];
    available_hours: string;
  };
  pricing: {
    consultation_fee: number;
    currency: string;
    session_duration: number;
  };
  verified: boolean;
  response_time: string;
}

interface BookingSlot {
  id: string;
  advisor_id: string;
  date: string;
  time: string;
  duration: number;
  available: boolean;
}

export default function AdvisorNetwork() {
  const { toast } = useToast();
  const [advisors, setAdvisors] = useState<Advisor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCountry, setSelectedCountry] = useState('all');
  const [selectedLanguage, setSelectedLanguage] = useState('all');
  const [selectedSpecialization, setSelectedSpecialization] = useState('all');
  const [selectedAdvisor, setSelectedAdvisor] = useState<Advisor | null>(null);
  const [showBookingDialog, setShowBookingDialog] = useState(false);
  const [bookingSlot, setBookingSlot] = useState<BookingSlot | null>(null);
  const [bookingNotes, setBookingNotes] = useState('');

  const countries = ['all', 'Canada', 'United States', 'United Kingdom', 'Australia', 'Germany', 'Ireland', 'Netherlands', 'Sweden'];
  const languages = ['all', 'English', 'French', 'Spanish', 'Arabic', 'Swahili', 'Portuguese', 'German'];
  const specializations = ['all', 'Visa Process', 'University Selection', 'Scholarship Applications', 'Academic Planning', 'Career Guidance', 'Cultural Adaptation'];

  useEffect(() => {
    fetchAdvisors();
  }, []);

  const fetchAdvisors = async () => {
    // Mock data - in real implementation, this would fetch from API
    const mockAdvisors: Advisor[] = [
      {
        id: '1',
        name: 'Dr. Sarah Johnson',
        title: 'Senior Education Consultant',
        bio: 'With over 10 years of experience in international education, Sarah specializes in helping African students navigate the Canadian university system. She has successfully guided over 500 students to top universities.',
        languages: ['English', 'French'],
        countries: ['Canada', 'United States'],
        specializations: ['Visa Process', 'University Selection', 'Scholarship Applications'],
        rating: 4.9,
        reviewCount: 127,
        experience: 10,
        availability: {
          timezone: 'EST',
          available_days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
          available_hours: '9:00 AM - 6:00 PM'
        },
        pricing: {
          consultation_fee: 150,
          currency: 'USD',
          session_duration: 60
        },
        verified: true,
        response_time: 'Within 2 hours'
      },
      {
        id: '2',
        name: 'Ahmed Hassan',
        title: 'International Student Advisor',
        bio: 'Ahmed is a former international student who now helps others achieve their study abroad dreams. He specializes in UK and European universities and understands the unique challenges faced by African students.',
        languages: ['English', 'Arabic', 'Swahili'],
        countries: ['United Kingdom', 'Germany', 'Netherlands'],
        specializations: ['Cultural Adaptation', 'Academic Planning', 'Career Guidance'],
        rating: 4.8,
        reviewCount: 89,
        experience: 7,
        availability: {
          timezone: 'GMT',
          available_days: ['Monday', 'Wednesday', 'Friday', 'Saturday'],
          available_hours: '10:00 AM - 8:00 PM'
        },
        pricing: {
          consultation_fee: 120,
          currency: 'USD',
          session_duration: 45
        },
        verified: true,
        response_time: 'Within 4 hours'
      },
      {
        id: '3',
        name: 'Maria Rodriguez',
        title: 'Scholarship Specialist',
        bio: 'Maria has helped students secure over $2M in scholarships and financial aid. She has deep knowledge of funding opportunities for international students and provides personalized strategies for each student.',
        languages: ['English', 'Spanish', 'Portuguese'],
        countries: ['United States', 'Canada', 'Australia'],
        specializations: ['Scholarship Applications', 'Financial Planning', 'University Selection'],
        rating: 4.9,
        reviewCount: 156,
        experience: 8,
        availability: {
          timezone: 'PST',
          available_days: ['Tuesday', 'Thursday', 'Saturday'],
          available_hours: '2:00 PM - 10:00 PM'
        },
        pricing: {
          consultation_fee: 180,
          currency: 'USD',
          session_duration: 90
        },
        verified: true,
        response_time: 'Within 1 hour'
      }
    ];

    setAdvisors(mockAdvisors);
    setLoading(false);
  };

  const getAvailableSlots = (advisorId: string): BookingSlot[] => {
    // Mock available slots - in real implementation, this would fetch from API
    const today = new Date();
    const slots: BookingSlot[] = [];
    
    for (let i = 1; i <= 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      
      const times = ['9:00 AM', '11:00 AM', '2:00 PM', '4:00 PM'];
      times.forEach(time => {
        slots.push({
          id: `${advisorId}-${date.toISOString().split('T')[0]}-${time}`,
          advisor_id: advisorId,
          date: date.toISOString().split('T')[0],
          time,
          duration: 60,
          available: Math.random() > 0.3 // Random availability
        });
      });
    }
    
    return slots.filter(slot => slot.available);
  };

  const handleBookSession = async () => {
    if (!selectedAdvisor || !bookingSlot) return;

    try {
      // In real implementation, this would create a booking
      toast({
        title: 'Booking Confirmed',
        description: `Your session with ${selectedAdvisor.name} has been booked for ${bookingSlot.date} at ${bookingSlot.time}`
      });
      
      setShowBookingDialog(false);
      setSelectedAdvisor(null);
      setBookingSlot(null);
      setBookingNotes('');
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to book session. Please try again.',
        variant: 'destructive'
      });
    }
  };

  const filteredAdvisors = advisors.filter(advisor => {
    const matchesSearch = searchTerm === '' || 
      advisor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      advisor.bio.toLowerCase().includes(searchTerm.toLowerCase()) ||
      advisor.specializations.some(spec => spec.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCountry = selectedCountry === 'all' || advisor.countries.includes(selectedCountry);
    const matchesLanguage = selectedLanguage === 'all' || advisor.languages.includes(selectedLanguage);
    const matchesSpecialization = selectedSpecialization === 'all' || advisor.specializations.includes(selectedSpecialization);
    return matchesSearch && matchesCountry && matchesLanguage && matchesSpecialization;
  });

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-48 bg-muted animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" />
            Advisor Network
          </h2>
          <p className="text-muted-foreground">Connect with verified education advisors who can guide your study abroad journey</p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search advisors by name, specialization, or expertise..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={selectedCountry} onValueChange={setSelectedCountry}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Country" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Countries</SelectItem>
                {countries.slice(1).map(country => (
                  <SelectItem key={country} value={country}>{country}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Language" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Languages</SelectItem>
                {languages.slice(1).map(language => (
                  <SelectItem key={language} value={language}>{language}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedSpecialization} onValueChange={setSelectedSpecialization}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Specialization" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Specializations</SelectItem>
                {specializations.slice(1).map(spec => (
                  <SelectItem key={spec} value={spec}>{spec}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Advisors Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredAdvisors.map((advisor) => (
          <Card key={advisor.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Users className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{advisor.name}</CardTitle>
                    <CardDescription>{advisor.title}</CardDescription>
                  </div>
                </div>
                {advisor.verified && (
                  <Badge className="bg-green-100 text-green-800">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Verified
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground line-clamp-3">{advisor.bio}</p>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4 text-yellow-500" />
                  <span className="text-sm font-medium">{advisor.rating}</span>
                  <span className="text-sm text-muted-foreground">({advisor.reviewCount} reviews)</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>{advisor.experience} years experience</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MessageCircle className="h-4 w-4" />
                  <span>Responds {advisor.response_time}</span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex flex-wrap gap-1">
                  {advisor.languages.slice(0, 3).map((language) => (
                    <Badge key={language} variant="outline" className="text-xs">
                      {language}
                    </Badge>
                  ))}
                  {advisor.languages.length > 3 && (
                    <Badge variant="outline" className="text-xs">
                      +{advisor.languages.length - 3}
                    </Badge>
                  )}
                </div>
                <div className="flex flex-wrap gap-1">
                  {advisor.specializations.slice(0, 2).map((spec) => (
                    <Badge key={spec} variant="secondary" className="text-xs">
                      {spec}
                    </Badge>
                  ))}
                  {advisor.specializations.length > 2 && (
                    <Badge variant="secondary" className="text-xs">
                      +{advisor.specializations.length - 2}
                    </Badge>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Consultation Fee</span>
                  <span className="font-medium">
                    ${advisor.pricing.consultation_fee} {advisor.pricing.currency}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Session Duration</span>
                  <span className="font-medium">{advisor.pricing.session_duration} minutes</span>
                </div>
              </div>

              <div className="flex gap-2">
                <Button 
                  className="flex-1"
                  onClick={() => {
                    setSelectedAdvisor(advisor);
                    setShowBookingDialog(true);
                  }}
                >
                  <CalendarIcon className="h-4 w-4 mr-2" />
                  Book Session
                </Button>
                <Button variant="outline" size="sm">
                  <MessageCircle className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Booking Dialog */}
      <Dialog open={showBookingDialog} onOpenChange={setShowBookingDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Book Session with {selectedAdvisor?.name}</DialogTitle>
          </DialogHeader>
          {selectedAdvisor && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h4 className="font-medium">Available Time Slots</h4>
                  <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                    {getAvailableSlots(selectedAdvisor.id).map((slot) => (
                      <Button
                        key={slot.id}
                        variant={bookingSlot?.id === slot.id ? "default" : "outline"}
                        size="sm"
                        onClick={() => setBookingSlot(slot)}
                        className="text-xs"
                      >
                        {new Date(slot.date).toLocaleDateString()}
                        <br />
                        {slot.time}
                      </Button>
                    ))}
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium mb-2">Session Details</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Duration:</span>
                        <span>{selectedAdvisor.pricing.session_duration} minutes</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Fee:</span>
                        <span>${selectedAdvisor.pricing.consultation_fee} {selectedAdvisor.pricing.currency}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Format:</span>
                        <span>Video Call</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Additional Notes (Optional)</label>
                    <Textarea
                      placeholder="Any specific questions or topics you'd like to discuss..."
                      value={bookingNotes}
                      onChange={(e) => setBookingNotes(e.target.value)}
                      rows={3}
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button 
                  onClick={handleBookSession}
                  disabled={!bookingSlot}
                  className="flex-1"
                >
                  Confirm Booking
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setShowBookingDialog(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
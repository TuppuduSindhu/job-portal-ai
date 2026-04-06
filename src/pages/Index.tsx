import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Briefcase, Users, Sparkles, ArrowRight } from 'lucide-react';

export default function Index() {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (user && profile) {
    return <Navigate to={profile.role === 'recruiter' ? '/recruiter' : '/dashboard'} replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto max-w-4xl px-4">
        <div className="flex flex-col items-center text-center py-20 animate-fade-in">
          <div className="rounded-full bg-accent p-4 mb-6">
            <Briefcase className="h-12 w-12 text-primary" />
          </div>
          <h1 className="text-4xl font-bold text-foreground sm:text-5xl">
            Find Your Dream Job with <span className="text-primary">AI</span>
          </h1>
          <p className="mt-4 max-w-xl text-lg text-muted-foreground">
            Smart Apply uses AI to match your skills with the perfect job opportunities. Upload your resume and let AI do the work.
          </p>
          <div className="mt-8 flex gap-3">
            <Link to="/auth">
              <Button size="lg" className="gap-2">
                Get Started <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>

          <div className="mt-20 grid gap-8 sm:grid-cols-3 w-full max-w-3xl">
            <div className="linkedin-card p-6 text-center">
              <Briefcase className="mx-auto h-8 w-8 text-primary mb-3" />
              <h3 className="font-semibold text-foreground">Browse Jobs</h3>
              <p className="text-sm text-muted-foreground mt-1">Search thousands of jobs with smart filters</p>
            </div>
            <div className="linkedin-card p-6 text-center">
              <Sparkles className="mx-auto h-8 w-8 text-primary mb-3" />
              <h3 className="font-semibold text-foreground">AI Matching</h3>
              <p className="text-sm text-muted-foreground mt-1">Upload your resume for AI-powered recommendations</p>
            </div>
            <div className="linkedin-card p-6 text-center">
              <Users className="mx-auto h-8 w-8 text-primary mb-3" />
              <h3 className="font-semibold text-foreground">For Recruiters</h3>
              <p className="text-sm text-muted-foreground mt-1">Post jobs and track applications easily</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import Navbar from '@/components/Navbar';
import JobCard from '@/components/JobCard';
import JobFilters from '@/components/JobFilters';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Briefcase, Bookmark, CheckCircle } from 'lucide-react';

type Job = {
  id: string;
  title: string;
  company: string;
  location: string;
  salary_min: number | null;
  salary_max: number | null;
  experience_required: number | null;
  skills_required: string[] | null;
  job_type: string;
  description: string;
  created_at: string;
  recruiter_id: string;
  is_active: boolean;
  updated_at: string;
};

export default function JobSeekerDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [savedJobIds, setSavedJobIds] = useState<Set<string>>(new Set());
  const [appliedJobIds, setAppliedJobIds] = useState<Set<string>>(new Set());
  const [filters, setFilters] = useState({
    search: '',
    location: 'all',
    experience: 'all',
    salary: 'all',
    jobType: 'all',
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchJobs();
    if (user) {
      fetchSavedJobs();
      fetchAppliedJobs();
    }
  }, [user]);

  const fetchJobs = async () => {
    const { data } = await supabase.from('jobs').select('*').eq('is_active', true).order('created_at', { ascending: false });
    if (data) setJobs(data);
    setLoading(false);
  };

  const fetchSavedJobs = async () => {
    const { data } = await supabase.from('saved_jobs').select('job_id').eq('user_id', user!.id);
    if (data) setSavedJobIds(new Set(data.map(s => s.job_id)));
  };

  const fetchAppliedJobs = async () => {
    const { data } = await supabase.from('applications').select('job_id').eq('applicant_id', user!.id);
    if (data) setAppliedJobIds(new Set(data.map(a => a.job_id)));
  };

  const handleApply = async (jobId: string) => {
    const { error } = await supabase.from('applications').insert({ job_id: jobId, applicant_id: user!.id });
    if (error) {
      toast({ title: 'Failed to apply', description: error.message, variant: 'destructive' });
    } else {
      setAppliedJobIds(prev => new Set(prev).add(jobId));
      toast({ title: 'Application submitted!' });
    }
  };

  const handleSave = async (jobId: string) => {
    const { error } = await supabase.from('saved_jobs').insert({ job_id: jobId, user_id: user!.id });
    if (error) {
      toast({ title: 'Failed to save', variant: 'destructive' });
    } else {
      setSavedJobIds(prev => new Set(prev).add(jobId));
    }
  };

  const handleUnsave = async (jobId: string) => {
    await supabase.from('saved_jobs').delete().eq('job_id', jobId).eq('user_id', user!.id);
    setSavedJobIds(prev => { const n = new Set(prev); n.delete(jobId); return n; });
  };

  const filtered = useMemo(() => {
    return jobs.filter(job => {
      if (filters.search) {
        const q = filters.search.toLowerCase();
        const match = job.title.toLowerCase().includes(q)
          || job.company.toLowerCase().includes(q)
          || job.description.toLowerCase().includes(q)
          || (job.skills_required || []).some(s => s.toLowerCase().includes(q));
        if (!match) return false;
      }
      if (filters.location !== 'all' && !job.location.toLowerCase().includes(filters.location)) return false;
      if (filters.experience !== 'all' && (job.experience_required || 0) > parseInt(filters.experience)) return false;
      if (filters.salary !== 'all' && (job.salary_min || 0) < parseInt(filters.salary)) return false;
      if (filters.jobType !== 'all' && job.job_type !== filters.jobType) return false;
      return true;
    });
  }, [jobs, filters]);

  const savedJobs = useMemo(() => jobs.filter(j => savedJobIds.has(j.id)), [jobs, savedJobIds]);
  const appliedJobs = useMemo(() => jobs.filter(j => appliedJobIds.has(j.id)), [jobs, appliedJobIds]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto max-w-4xl px-4 py-6">
        <JobFilters filters={filters} onChange={setFilters} />

        <Tabs defaultValue="all" className="mt-4">
          <TabsList>
            <TabsTrigger value="all" className="gap-1.5">
              <Briefcase className="h-4 w-4" /> All Jobs ({filtered.length})
            </TabsTrigger>
            <TabsTrigger value="saved" className="gap-1.5">
              <Bookmark className="h-4 w-4" /> Saved ({savedJobs.length})
            </TabsTrigger>
            <TabsTrigger value="applied" className="gap-1.5">
              <CheckCircle className="h-4 w-4" /> Applied ({appliedJobs.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-4 space-y-3">
            {filtered.length === 0 ? (
              <div className="linkedin-card p-12 text-center text-muted-foreground">
                <Briefcase className="mx-auto h-12 w-12 mb-3 opacity-30" />
                <p className="font-medium">No jobs found</p>
                <p className="text-sm">Try adjusting your filters</p>
              </div>
            ) : (
              filtered.map(job => (
                <JobCard
                  key={job.id}
                  job={job}
                  isSaved={savedJobIds.has(job.id)}
                  isApplied={appliedJobIds.has(job.id)}
                  onApply={handleApply}
                  onSave={handleSave}
                  onUnsave={handleUnsave}
                />
              ))
            )}
          </TabsContent>

          <TabsContent value="saved" className="mt-4 space-y-3">
            {savedJobs.length === 0 ? (
              <div className="linkedin-card p-12 text-center text-muted-foreground">
                <Bookmark className="mx-auto h-12 w-12 mb-3 opacity-30" />
                <p className="font-medium">No saved jobs</p>
              </div>
            ) : (
              savedJobs.map(job => (
                <JobCard key={job.id} job={job} isSaved onApply={handleApply} isApplied={appliedJobIds.has(job.id)} onUnsave={handleUnsave} />
              ))
            )}
          </TabsContent>

          <TabsContent value="applied" className="mt-4 space-y-3">
            {appliedJobs.length === 0 ? (
              <div className="linkedin-card p-12 text-center text-muted-foreground">
                <CheckCircle className="mx-auto h-12 w-12 mb-3 opacity-30" />
                <p className="font-medium">No applications yet</p>
              </div>
            ) : (
              appliedJobs.map(job => (
                <JobCard key={job.id} job={job} isApplied showActions={false} />
              ))
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

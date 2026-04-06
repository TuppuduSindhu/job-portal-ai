import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import Navbar from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2, Users, Briefcase, Eye } from 'lucide-react';

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
  is_active: boolean;
  created_at: string;
  recruiter_id: string;
  updated_at: string;
};

type Application = {
  id: string;
  job_id: string;
  applicant_id: string;
  status: string;
  cover_letter: string | null;
  created_at: string;
  applicant_name?: string;
  applicant_email?: string;
};

const emptyForm = {
  title: '',
  company: '',
  description: '',
  location: '',
  salary_min: '',
  salary_max: '',
  experience_required: '',
  skills_required: '',
  job_type: 'full-time',
};

export default function RecruiterDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [appCounts, setAppCounts] = useState<Record<string, number>>({});
  const [applications, setApplications] = useState<Application[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [appDialogOpen, setAppDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) fetchJobs();
  }, [user]);

  const fetchJobs = async () => {
    const { data } = await supabase
      .from('jobs')
      .select('*')
      .eq('recruiter_id', user!.id)
      .order('created_at', { ascending: false });
    if (data) {
      setJobs(data);
      // Fetch application counts
      const counts: Record<string, number> = {};
      for (const job of data) {
        const { count } = await supabase
          .from('applications')
          .select('*', { count: 'exact', head: true })
          .eq('job_id', job.id);
        counts[job.id] = count || 0;
      }
      setAppCounts(counts);
    }
    setLoading(false);
  };

  const viewApplicants = async (jobId: string) => {
    setSelectedJobId(jobId);
    const { data } = await supabase
      .from('applications')
      .select('*')
      .eq('job_id', jobId)
      .order('created_at', { ascending: false });
    
    if (data) {
      // Fetch applicant profiles
      const enriched = await Promise.all(
        data.map(async (app) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('user_id', app.applicant_id)
            .single();
          return { ...app, applicant_name: profile?.full_name || 'Unknown' };
        })
      );
      setApplications(enriched);
    }
    setAppDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      title: form.title,
      company: form.company,
      description: form.description,
      location: form.location,
      salary_min: form.salary_min ? parseInt(form.salary_min) : null,
      salary_max: form.salary_max ? parseInt(form.salary_max) : null,
      experience_required: form.experience_required ? parseInt(form.experience_required) : 0,
      skills_required: form.skills_required.split(',').map(s => s.trim()).filter(Boolean),
      job_type: form.job_type,
      recruiter_id: user!.id,
    };

    if (editingId) {
      const { error } = await supabase.from('jobs').update(payload).eq('id', editingId);
      if (error) {
        toast({ title: 'Update failed', description: error.message, variant: 'destructive' });
        return;
      }
      toast({ title: 'Job updated' });
    } else {
      const { error } = await supabase.from('jobs').insert(payload);
      if (error) {
        toast({ title: 'Failed to post', description: error.message, variant: 'destructive' });
        return;
      }
      toast({ title: 'Job posted!' });
    }

    setForm(emptyForm);
    setEditingId(null);
    setDialogOpen(false);
    fetchJobs();
  };

  const handleEdit = (job: Job) => {
    setForm({
      title: job.title,
      company: job.company,
      description: job.description,
      location: job.location,
      salary_min: job.salary_min?.toString() || '',
      salary_max: job.salary_max?.toString() || '',
      experience_required: job.experience_required?.toString() || '',
      skills_required: (job.skills_required || []).join(', '),
      job_type: job.job_type,
    });
    setEditingId(job.id);
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('jobs').delete().eq('id', id);
    if (error) {
      toast({ title: 'Delete failed', variant: 'destructive' });
    } else {
      toast({ title: 'Job deleted' });
      fetchJobs();
    }
  };

  const updateApplicationStatus = async (appId: string, status: string) => {
    await supabase.from('applications').update({ status }).eq('id', appId);
    setApplications(prev => prev.map(a => a.id === appId ? { ...a, status } : a));
    toast({ title: `Application ${status}` });
  };

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
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Recruiter Dashboard</h1>
            <p className="text-muted-foreground">Manage your job postings</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) { setForm(emptyForm); setEditingId(null); } }}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-1" /> Post Job</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingId ? 'Edit Job' : 'Post New Job'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>Job Title</Label>
                    <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required />
                  </div>
                  <div className="space-y-1">
                    <Label>Company</Label>
                    <Input value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))} required />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label>Location</Label>
                  <Input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} required />
                </div>
                <div className="space-y-1">
                  <Label>Description</Label>
                  <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} required rows={4} />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label>Min Salary</Label>
                    <Input type="number" value={form.salary_min} onChange={e => setForm(f => ({ ...f, salary_min: e.target.value }))} placeholder="50000" />
                  </div>
                  <div className="space-y-1">
                    <Label>Max Salary</Label>
                    <Input type="number" value={form.salary_max} onChange={e => setForm(f => ({ ...f, salary_max: e.target.value }))} placeholder="100000" />
                  </div>
                  <div className="space-y-1">
                    <Label>Exp (years)</Label>
                    <Input type="number" value={form.experience_required} onChange={e => setForm(f => ({ ...f, experience_required: e.target.value }))} placeholder="0" />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label>Skills (comma separated)</Label>
                  <Input value={form.skills_required} onChange={e => setForm(f => ({ ...f, skills_required: e.target.value }))} placeholder="React, TypeScript, Node.js" />
                </div>
                <div className="space-y-1">
                  <Label>Job Type</Label>
                  <Select value={form.job_type} onValueChange={v => setForm(f => ({ ...f, job_type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="full-time">Full-time</SelectItem>
                      <SelectItem value="part-time">Part-time</SelectItem>
                      <SelectItem value="contract">Contract</SelectItem>
                      <SelectItem value="internship">Internship</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" className="w-full">{editingId ? 'Update Job' : 'Post Job'}</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <Briefcase className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">{jobs.length}</p>
                <p className="text-xs text-muted-foreground">Total Jobs</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <Eye className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">{jobs.filter(j => j.is_active).length}</p>
                <p className="text-xs text-muted-foreground">Active</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <Users className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">{Object.values(appCounts).reduce((a, b) => a + b, 0)}</p>
                <p className="text-xs text-muted-foreground">Applications</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Jobs list */}
        <div className="space-y-3">
          {jobs.map(job => (
            <div key={job.id} className="linkedin-card p-5 animate-fade-in">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-foreground">{job.title}</h3>
                    <Badge variant={job.is_active ? 'default' : 'secondary'}>
                      {job.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  <p className="text-sm text-primary">{job.company} · {job.location}</p>
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-1">{job.description}</p>
                  {job.skills_required && job.skills_required.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {job.skills_required.map(s => (
                        <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <Button variant="outline" size="sm" onClick={() => viewApplicants(job.id)}>
                    <Users className="h-4 w-4 mr-1" /> {appCounts[job.id] || 0}
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleEdit(job)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(job.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
          {jobs.length === 0 && (
            <div className="linkedin-card p-12 text-center text-muted-foreground">
              <Briefcase className="mx-auto h-12 w-12 mb-3 opacity-30" />
              <p className="font-medium">No jobs posted yet</p>
              <p className="text-sm">Click "Post Job" to get started</p>
            </div>
          )}
        </div>

        {/* Applicants Dialog */}
        <Dialog open={appDialogOpen} onOpenChange={setAppDialogOpen}>
          <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Applicants ({applications.length})</DialogTitle>
            </DialogHeader>
            {applications.length === 0 ? (
              <p className="text-center text-muted-foreground py-6">No applicants yet</p>
            ) : (
              <div className="space-y-3">
                {applications.map(app => (
                  <div key={app.id} className="border rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{app.applicant_name}</p>
                        <p className="text-xs text-muted-foreground">{new Date(app.created_at).toLocaleDateString()}</p>
                      </div>
                      <Badge variant={
                        app.status === 'accepted' ? 'default' :
                        app.status === 'rejected' ? 'destructive' : 'secondary'
                      }>
                        {app.status}
                      </Badge>
                    </div>
                    {app.cover_letter && (
                      <p className="text-sm text-muted-foreground mt-2">{app.cover_letter}</p>
                    )}
                    {app.status === 'pending' && (
                      <div className="flex gap-2 mt-3">
                        <Button size="sm" onClick={() => updateApplicationStatus(app.id, 'accepted')}>Accept</Button>
                        <Button size="sm" variant="outline" onClick={() => updateApplicationStatus(app.id, 'rejected')}>Reject</Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}

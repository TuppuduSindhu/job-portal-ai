import { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import Navbar from '@/components/Navbar';
import JobCard from '@/components/JobCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Upload, FileText, Sparkles, Loader2 } from 'lucide-react';

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

export default function ResumeRecommendations() {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [recommendedJobs, setRecommendedJobs] = useState<Job[]>([]);
  const [matchedSkills, setMatchedSkills] = useState<string[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.type !== 'application/pdf') {
      toast({ title: 'Please upload a PDF file', variant: 'destructive' });
      return;
    }

    setFileName(file.name);
    setUploading(true);

    try {
      // Upload to storage
      const path = `${user.id}/${Date.now()}_${file.name}`;
      const { error: uploadErr } = await supabase.storage.from('resumes').upload(path, file);
      if (uploadErr) throw uploadErr;

      // Update profile with resume URL
      const { data: { publicUrl } } = supabase.storage.from('resumes').getPublicUrl(path);
      await supabase.from('profiles').update({ resume_url: publicUrl }).eq('user_id', user.id);

      setUploading(false);
      setAnalyzing(true);

      // Call AI edge function to analyze resume
      const { data, error } = await supabase.functions.invoke('analyze-resume', {
        body: { userId: user.id, filePath: path },
      });

      if (error) throw error;

      if (data?.skills) {
        setMatchedSkills(data.skills);
      }

      // Fetch matching jobs
      const { data: allJobs } = await supabase.from('jobs').select('*').eq('is_active', true);
      if (allJobs && data?.skills) {
        const skills = (data.skills as string[]).map((s: string) => s.toLowerCase());
        const matched = allJobs
          .map(job => {
            const jobSkills = (job.skills_required || []).map(s => s.toLowerCase());
            const score = jobSkills.filter(s => skills.some(rs => s.includes(rs) || rs.includes(s))).length;
            return { ...job, score };
          })
          .filter(j => j.score > 0)
          .sort((a, b) => b.score - a.score);
        setRecommendedJobs(matched);
      }

      toast({ title: 'Resume analyzed!', description: `Found ${data?.skills?.length || 0} skills` });
    } catch (err: any) {
      toast({ title: 'Analysis failed', description: err.message, variant: 'destructive' });
    } finally {
      setUploading(false);
      setAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto max-w-4xl px-4 py-6">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              AI Resume Matching
            </CardTitle>
            <CardDescription>Upload your resume and get AI-powered job recommendations</CardDescription>
          </CardHeader>
          <CardContent>
            <input
              ref={fileRef}
              type="file"
              accept=".pdf"
              className="hidden"
              onChange={handleUpload}
            />
            <div
              onClick={() => fileRef.current?.click()}
              className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
            >
              {uploading ? (
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">Uploading resume...</p>
                </div>
              ) : analyzing ? (
                <div className="flex flex-col items-center gap-2">
                  <Sparkles className="h-8 w-8 animate-pulse text-primary" />
                  <p className="text-sm text-muted-foreground">AI is analyzing your resume...</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  {fileName ? (
                    <>
                      <FileText className="h-8 w-8 text-primary" />
                      <p className="text-sm font-medium">{fileName}</p>
                      <p className="text-xs text-muted-foreground">Click to upload a different resume</p>
                    </>
                  ) : (
                    <>
                      <Upload className="h-8 w-8 text-muted-foreground" />
                      <p className="text-sm font-medium">Upload your resume (PDF)</p>
                      <p className="text-xs text-muted-foreground">Click to browse</p>
                    </>
                  )}
                </div>
              )}
            </div>

            {matchedSkills.length > 0 && (
              <div className="mt-4">
                <p className="text-sm font-medium mb-2">Detected Skills:</p>
                <div className="flex flex-wrap gap-1.5">
                  {matchedSkills.map(skill => (
                    <span key={skill} className="rounded-full bg-accent px-3 py-1 text-xs font-medium text-accent-foreground">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {recommendedJobs.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Recommended Jobs ({recommendedJobs.length})
            </h2>
            <div className="space-y-3">
              {recommendedJobs.map(job => (
                <JobCard key={job.id} job={job} showActions={false} />
              ))}
            </div>
          </div>
        )}

        {matchedSkills.length > 0 && recommendedJobs.length === 0 && (
          <div className="linkedin-card p-12 text-center text-muted-foreground">
            <Sparkles className="mx-auto h-12 w-12 mb-3 opacity-30" />
            <p className="font-medium">No matching jobs found</p>
            <p className="text-sm">Check back later for new opportunities</p>
          </div>
        )}
      </main>
    </div>
  );
}

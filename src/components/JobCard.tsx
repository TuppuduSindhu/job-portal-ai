import { Bookmark, BookmarkCheck, MapPin, DollarSign, Clock, Briefcase } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

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
};

type Props = {
  job: Job;
  isSaved?: boolean;
  isApplied?: boolean;
  onApply?: (jobId: string) => void;
  onSave?: (jobId: string) => void;
  onUnsave?: (jobId: string) => void;
  showActions?: boolean;
};

export default function JobCard({ job, isSaved, isApplied, onApply, onSave, onUnsave, showActions = true }: Props) {
  const formatSalary = (min: number | null, max: number | null) => {
    if (!min && !max) return null;
    const fmt = (n: number) => `$${(n / 1000).toFixed(0)}k`;
    if (min && max) return `${fmt(min)} - ${fmt(max)}`;
    if (min) return `From ${fmt(min)}`;
    return `Up to ${fmt(max!)}`;
  };

  const salary = formatSalary(job.salary_min, job.salary_max);
  const timeAgo = getTimeAgo(job.created_at);

  return (
    <div className="linkedin-card p-5 hover:shadow-md transition-shadow animate-fade-in">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-foreground truncate">{job.title}</h3>
          <p className="text-sm font-medium text-primary">{job.company}</p>

          <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" /> {job.location}
            </span>
            {salary && (
              <span className="flex items-center gap-1">
                <DollarSign className="h-3.5 w-3.5" /> {salary}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Briefcase className="h-3.5 w-3.5" /> {job.job_type}
            </span>
            {job.experience_required != null && job.experience_required > 0 && (
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" /> {job.experience_required}+ yrs
              </span>
            )}
          </div>

          {job.skills_required && job.skills_required.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {job.skills_required.slice(0, 5).map(skill => (
                <Badge key={skill} variant="secondary" className="text-xs">
                  {skill}
                </Badge>
              ))}
              {job.skills_required.length > 5 && (
                <Badge variant="outline" className="text-xs">+{job.skills_required.length - 5}</Badge>
              )}
            </div>
          )}

          <p className="mt-3 text-sm text-muted-foreground line-clamp-2">{job.description}</p>
          <p className="mt-2 text-xs text-muted-foreground">{timeAgo}</p>
        </div>

        {showActions && (
          <div className="ml-4 flex flex-col gap-2 shrink-0">
            {isSaved ? (
              <Button variant="ghost" size="icon" onClick={() => onUnsave?.(job.id)} title="Unsave">
                <BookmarkCheck className="h-5 w-5 text-primary" />
              </Button>
            ) : (
              <Button variant="ghost" size="icon" onClick={() => onSave?.(job.id)} title="Save">
                <Bookmark className="h-5 w-5" />
              </Button>
            )}
          </div>
        )}
      </div>

      {showActions && (
        <div className="mt-4 flex gap-2">
          {isApplied ? (
            <Button disabled variant="secondary" size="sm">Applied</Button>
          ) : (
            <Button size="sm" onClick={() => onApply?.(job.id)}>Apply Now</Button>
          )}
        </div>
      )}
    </div>
  );
}

function getTimeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

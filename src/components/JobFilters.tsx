import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, SlidersHorizontal } from 'lucide-react';

type Filters = {
  search: string;
  location: string;
  experience: string;
  salary: string;
  jobType: string;
};

type Props = {
  filters: Filters;
  onChange: (filters: Filters) => void;
};

export default function JobFilters({ filters, onChange }: Props) {
  const update = (key: keyof Filters, value: string) => {
    onChange({ ...filters, [key]: value });
  };

  return (
    <div className="linkedin-card p-4 space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
        <SlidersHorizontal className="h-4 w-4" />
        Filters
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search jobs, skills, companies..."
          value={filters.search}
          onChange={e => update('search', e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Select value={filters.location} onValueChange={v => update('location', v)}>
          <SelectTrigger><SelectValue placeholder="Location" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Locations</SelectItem>
            <SelectItem value="remote">Remote</SelectItem>
            <SelectItem value="new york">New York</SelectItem>
            <SelectItem value="san francisco">San Francisco</SelectItem>
            <SelectItem value="london">London</SelectItem>
            <SelectItem value="bangalore">Bangalore</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filters.experience} onValueChange={v => update('experience', v)}>
          <SelectTrigger><SelectValue placeholder="Experience" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any Experience</SelectItem>
            <SelectItem value="0">Fresher</SelectItem>
            <SelectItem value="2">2+ years</SelectItem>
            <SelectItem value="5">5+ years</SelectItem>
            <SelectItem value="10">10+ years</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filters.salary} onValueChange={v => update('salary', v)}>
          <SelectTrigger><SelectValue placeholder="Salary" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any Salary</SelectItem>
            <SelectItem value="50000">$50k+</SelectItem>
            <SelectItem value="100000">$100k+</SelectItem>
            <SelectItem value="150000">$150k+</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filters.jobType} onValueChange={v => update('jobType', v)}>
          <SelectTrigger><SelectValue placeholder="Job Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="full-time">Full-time</SelectItem>
            <SelectItem value="part-time">Part-time</SelectItem>
            <SelectItem value="contract">Contract</SelectItem>
            <SelectItem value="internship">Internship</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

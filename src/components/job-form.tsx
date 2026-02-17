'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { z } from 'zod';

const jobFormSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title must be 200 characters or less'),
  description: z.string().min(1, 'Description is required').max(10000, 'Description must be 10000 characters or less'),
  budgetMin: z.number().int().positive().optional().nullable(),
  budgetMax: z.number().int().positive().optional().nullable(),
  timeline: z.string().max(200).optional().nullable(),
  skillsRequired: z.array(z.string()).max(50).optional(),
  experienceLevel: z.enum(['junior', 'mid', 'senior', 'lead', 'executive']).optional().nullable(),
  jobType: z.enum(['full-time', 'part-time', 'contract', 'project']),
}).refine((data) => {
  if (data.budgetMin !== null && data.budgetMin !== undefined && data.budgetMax !== null && data.budgetMax !== undefined) {
    return data.budgetMin <= data.budgetMax;
  }
  return true;
}, {
  message: "Minimum budget must be less than or equal to maximum budget",
  path: ["budgetMin"],
});

export type JobFormData = z.infer<typeof jobFormSchema>;

interface JobFormProps {
  initialData?: Partial<JobFormData> & { id?: string };
  onSubmit: (data: JobFormData) => Promise<void>;
  isLoading?: boolean;
  isEditing?: boolean;
}

const EXPERIENCE_LEVELS = [
  { value: 'junior', label: 'Junior' },
  { value: 'mid', label: 'Mid-Level' },
  { value: 'senior', label: 'Senior' },
  { value: 'lead', label: 'Lead' },
  { value: 'executive', label: 'Executive' },
] as const;

const JOB_TYPES = [
  { value: 'full-time', label: 'Full-Time' },
  { value: 'part-time', label: 'Part-Time' },
  { value: 'contract', label: 'Contract' },
  { value: 'project', label: 'Project' },
] as const;

export function JobForm({ initialData, onSubmit, isLoading = false, isEditing = false }: JobFormProps) {
  const router = useRouter();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [skillInput, setSkillInput] = useState('');
  
  const [formData, setFormData] = useState<JobFormData>({
    title: initialData?.title || '',
    description: initialData?.description || '',
    budgetMin: initialData?.budgetMin ?? null,
    budgetMax: initialData?.budgetMax ?? null,
    timeline: initialData?.timeline || '',
    skillsRequired: initialData?.skillsRequired || [],
    experienceLevel: initialData?.experienceLevel || null,
    jobType: initialData?.jobType || 'full-time',
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value === '' ? (name === 'jobType' ? 'full-time' : null) : value,
    }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>, field: 'budgetMin' | 'budgetMax') => {
    const value = e.target.value;
    setFormData(prev => ({
      ...prev,
      [field]: value === '' ? null : parseInt(value, 10),
    }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const addSkill = () => {
    const trimmed = skillInput.trim();
    if (trimmed && !formData.skillsRequired?.includes(trimmed)) {
      setFormData(prev => ({
        ...prev,
        skillsRequired: [...(prev.skillsRequired || []), trimmed],
      }));
      setSkillInput('');
      if (errors.skillsRequired) {
        setErrors(prev => ({ ...prev, skillsRequired: '' }));
      }
    }
  };

  const removeSkill = (skillToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      skillsRequired: prev.skillsRequired?.filter(s => s !== skillToRemove) || [],
    }));
  };

  const handleSkillKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addSkill();
    }
  };

  const validate = (): boolean => {
    try {
      jobFormSchema.parse(formData);
      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        error.issues.forEach((err: z.ZodIssue) => {
          const path = err.path[0];
          if (path) {
            fieldErrors[path.toString()] = err.message;
          }
        });
        setErrors(fieldErrors);
      }
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validate()) {
      return;
    }

    try {
      await onSubmit(formData);
    } catch (error) {
      console.error('Form submission error:', error);
    }
  };

  const handleCancel = () => {
    router.back();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-200">
          Job Title <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="title"
          name="title"
          value={formData.title}
          onChange={handleChange}
          placeholder="e.g. Senior React Developer"
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
        />
        {errors.title && (
          <p className="text-sm text-red-500">{errors.title}</p>
        )}
      </div>

      <div className="space-y-2">
        <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-200">
          Description <span className="text-red-500">*</span>
        </label>
        <textarea
          id="description"
          name="description"
          value={formData.description}
          onChange={handleChange}
          placeholder="Describe the role, responsibilities, and what makes this opportunity exciting..."
          rows={6}
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all resize-y"
        />
        {errors.description && (
          <p className="text-sm text-red-500">{errors.description}</p>
        )}
      </div>

      {/* Budget Range */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label htmlFor="budgetMin" className="block text-sm font-medium text-gray-700 dark:text-gray-200">
            Budget Min ($)
          </label>
          <input
            type="number"
            id="budgetMin"
            name="budgetMin"
            value={formData.budgetMin ?? ''}
            onChange={(e) => handleNumberChange(e, 'budgetMin')}
            placeholder="e.g. 5000"
            min="0"
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="budgetMax" className="block text-sm font-medium text-gray-700 dark:text-gray-200">
            Budget Max ($)
          </label>
          <input
            type="number"
            id="budgetMax"
            name="budgetMax"
            value={formData.budgetMax ?? ''}
            onChange={(e) => handleNumberChange(e, 'budgetMax')}
            placeholder="e.g. 10000"
            min="0"
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
          />
        </div>
      </div>
      {(errors.budgetMin || errors.budgetMax) && (
        <p className="text-sm text-red-500">{errors.budgetMin || errors.budgetMax}</p>
      )}

      {/* Timeline */}
      <div className="space-y-2">
        <label htmlFor="timeline" className="block text-sm font-medium text-gray-700 dark:text-gray-200">
          Timeline
        </label>
        <input
          type="text"
          id="timeline"
          name="timeline"
          value={formData.timeline ?? ''}
          onChange={handleChange}
          placeholder="e.g. 2 weeks, 1 month, ASAP"
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
        />
      </div>

      {/* Skills Required */}
      <div className="space-y-2">
        <label htmlFor="skillsRequired" className="block text-sm font-medium text-gray-700 dark:text-gray-200">
          Skills Required
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            id="skillsRequired"
            value={skillInput}
            onChange={(e) => setSkillInput(e.target.value)}
            onKeyDown={handleSkillKeyDown}
            placeholder="Add a skill and press Enter"
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
          />
          <button
            type="button"
            onClick={addSkill}
            className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            Add
          </button>
        </div>
        {formData.skillsRequired && formData.skillsRequired.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {formData.skillsRequired.map((skill) => (
              <span
                key={skill}
                className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-sm"
              >
                {skill}
                <button
                  type="button"
                  onClick={() => removeSkill(skill)}
                  className="ml-1 hover:text-blue-600 dark:hover:text-blue-300"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
        {errors.skillsRequired && (
          <p className="text-sm text-red-500">{errors.skillsRequired}</p>
        )}
      </div>

      {/* Experience Level & Job Type */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label htmlFor="experienceLevel" className="block text-sm font-medium text-gray-700 dark:text-gray-200">
            Experience Level
          </label>
          <select
            id="experienceLevel"
            name="experienceLevel"
            value={formData.experienceLevel ?? ''}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
          >
            <option value="">Select experience level</option>
            {EXPERIENCE_LEVELS.map((level) => (
              <option key={level.value} value={level.value}>
                {level.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <label htmlFor="jobType" className="block text-sm font-medium text-gray-700 dark:text-gray-200">
            Job Type <span className="text-red-500">*</span>
          </label>
          <select
            id="jobType"
            name="jobType"
            value={formData.jobType}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
          >
            {JOB_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row justify-end gap-3 sm:gap-4 pt-4">
        <button
          type="button"
          onClick={handleCancel}
          disabled={isLoading}
          className="w-full sm:w-auto px-6 py-2.5 min-h-[44px] border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className="w-full sm:w-auto px-6 py-2.5 min-h-[44px] bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isLoading && (
            <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          )}
          {isEditing ? 'Update Job' : 'Create Job'}
        </button>
      </div>
    </form>
  );
}

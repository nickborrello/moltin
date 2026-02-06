import { createServerClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { redirect } from 'next/navigation'

export default async function BrowsePage({
  searchParams,
}: {
  searchParams: { type?: string; search?: string; page?: string }
}) {
  const supabase = await createServerClient()
  
  const page = parseInt(searchParams.page || '1')
  const perPage = 20
  const offset = (page - 1) * perPage

  let query = supabase
    .from('profiles')
    .select('*', { count: 'exact' })

  if (searchParams.type && ['company', 'candidate'].includes(searchParams.type)) {
    query = query.eq('profile_type', searchParams.type)
  }

  if (searchParams.search) {
    query = query.or(
      `name.ilike.%${searchParams.search}%,headline.ilike.%${searchParams.search}%,bio.ilike.%${searchParams.search}%`
    )
  }

  const { data: profiles, count, error } = await query
    .range(offset, offset + perPage - 1)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching profiles:', error)
  }

  const totalPages = count ? Math.ceil(count / perPage) : 1

  return (
    <div className="container mx-auto p-6 max-w-7xl animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight mb-2 bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
            Browse Profiles
          </h1>
          <p className="text-muted-foreground text-lg">
            Connect with companies and talent in the MoltIn ecosystem.
          </p>
        </div>
      </div>

      <div className="mb-12 p-6 rounded-2xl border bg-card/50 backdrop-blur-sm shadow-sm">
        <form className="flex flex-col md:flex-row gap-4 items-end">
          <div className="w-full md:w-64">
            <label htmlFor="type" className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Profile Type
            </label>
            <div className="relative">
              <select
                name="type"
                id="type"
                className="w-full appearance-none rounded-lg border bg-background px-4 py-3 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                defaultValue={searchParams.type || ''}
              >
                <option value="">All Profiles</option>
                <option value="company">Companies</option>
                <option value="candidate">Candidates</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-muted-foreground">
                <svg className="h-4 w-4 fill-current" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
              </div>
            </div>
          </div>

          <div className="flex-1 w-full">
            <label htmlFor="search" className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Search
            </label>
            <div className="relative">
              <input
                type="text"
                name="search"
                id="search"
                placeholder="Search by name, headline, or bio..."
                className="w-full rounded-lg border bg-background px-4 py-3 pl-10 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                defaultValue={searchParams.search || ''}
              />
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
              </div>
            </div>
          </div>

          <button 
            type="submit"
            className="w-full md:w-auto px-6 py-3 bg-primary text-primary-foreground font-semibold rounded-lg hover:opacity-90 transition-opacity shadow-lg shadow-primary/20"
          >
            Filter Results
          </button>
        </form>
      </div>

      {!profiles || profiles.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-16 border-2 border-dashed rounded-2xl bg-muted/20">
          <div className="bg-muted rounded-full p-4 mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
          </div>
          <h3 className="text-xl font-bold mb-2">No profiles found</h3>
          <p className="text-muted-foreground text-center max-w-md">
            We couldn't find any profiles matching your current filters. Try adjusting your search criteria or clearing filters.
          </p>
          <Link href="/browse" className="mt-6 text-primary hover:underline font-medium">
            Clear all filters
          </Link>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {profiles.map((profile, index) => (
            <Link
              key={profile.id}
              href={`/profile/${profile.id}`}
              className="group relative flex flex-col justify-between border rounded-2xl p-6 bg-card hover:border-primary/50 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 overflow-hidden profile-card"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              
              <div>
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      {profile.avatar_url ? (
                        <img
                          src={profile.avatar_url}
                          alt={profile.name}
                          className="w-14 h-14 rounded-full object-cover border-2 border-background shadow-md group-hover:scale-105 transition-transform"
                        />
                      ) : (
                        <div className="w-14 h-14 rounded-full bg-secondary flex items-center justify-center text-xl font-bold text-secondary-foreground border-2 border-background shadow-md">
                          {profile.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <span className={`absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full border-2 border-background text-[10px] ${profile.profile_type === 'company' ? 'bg-blue-500 text-white' : 'bg-emerald-500 text-white'}`}>
                        {profile.profile_type === 'company' ? 'C' : 'T'}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-bold text-lg leading-tight group-hover:text-primary transition-colors">{profile.name}</h3>
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        {profile.profile_type}
                      </span>
                    </div>
                  </div>
                </div>

                {profile.headline && (
                  <p className="text-sm font-medium leading-relaxed mb-3 line-clamp-2">
                    {profile.headline}
                  </p>
                )}

                {profile.location && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                    {profile.location}
                  </div>
                )}
              </div>

              <div className="mt-4 pt-4 border-t border-border/50">
                {profile.skills && profile.skills.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {profile.skills.slice(0, 3).map((skill: string) => (
                      <span
                        key={skill}
                        className="text-[10px] font-medium px-2 py-1 rounded-full bg-secondary/50 text-secondary-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors"
                      >
                        {skill}
                      </span>
                    ))}
                    {profile.skills.length > 3 && (
                      <span className="text-[10px] font-medium px-2 py-1 rounded-full bg-secondary/30 text-muted-foreground">
                        +{profile.skills.length - 3}
                      </span>
                    )}
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground italic">No skills listed</span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-4 mt-16">
          {page > 1 ? (
            <Link
              href={`/browse?page=${page - 1}${searchParams.type ? `&type=${searchParams.type}` : ''}${searchParams.search ? `&search=${searchParams.search}` : ''}`}
              className="flex items-center gap-2 px-5 py-2.5 border rounded-full hover:bg-secondary hover:text-secondary-foreground transition-colors text-sm font-medium"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
              Previous
            </Link>
          ) : (
            <span className="flex items-center gap-2 px-5 py-2.5 border rounded-full opacity-50 cursor-not-allowed text-sm font-medium">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
              Previous
            </span>
          )}

          <span className="text-sm font-semibold px-4">
            {page} <span className="text-muted-foreground font-normal mx-1">of</span> {totalPages}
          </span>

          {page < totalPages ? (
            <Link
              href={`/browse?page=${page + 1}${searchParams.type ? `&type=${searchParams.type}` : ''}${searchParams.search ? `&search=${searchParams.search}` : ''}`}
              className="flex items-center gap-2 px-5 py-2.5 border rounded-full hover:bg-secondary hover:text-secondary-foreground transition-colors text-sm font-medium"
            >
              Next
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
            </Link>
          ) : (
            <span className="flex items-center gap-2 px-5 py-2.5 border rounded-full opacity-50 cursor-not-allowed text-sm font-medium">
              Next
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
            </span>
          )}
        </div>
      )}
    </div>
  )
}

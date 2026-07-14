import type { Company, CompanyProfile } from "@/types/company";

export default function CompanyCard({
  company,
  profile,
}: {
  company: Company;
  profile: CompanyProfile;
}) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-5 flex items-center gap-4">
      {profile.logo && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={profile.logo}
          alt={company.name}
          className="w-12 h-12 rounded-lg object-contain bg-white"
        />
      )}
      <div>
        <h2 className="text-white font-semibold text-lg">
          {company.name} ({company.ticker})
        </h2>
        <p className="text-slate-400 text-sm">
          {profile.industry} • {profile.country} • IPO {profile.ipo}
        </p>
      </div>
    </div>
  );
}


import type { SVGProps } from 'react';

export default function Logo({ className }: { className?: string }) {
  return (
    <div className={`inline-flex items-center justify-center gap-2 font-headline text-2xl font-bold ${className}`}>
      <NandiNetIcon className="h-10 w-10" />
      <span>NANDI NET</span>
    </div>
  );
}

const NandiNetIcon = (props: SVGProps<SVGSVGElement>) => (
    <svg 
        width="48" 
        height="48" 
        viewBox="0 0 48 48" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        {...props}
    >
        <circle cx="24" cy="24" r="24" fill="url(#paint0_linear_1_2)"/>
        <path d="M17.488 33.344V14.656H20.096L28.672 25.184V14.656H31.072V33.344H28.48L19.872 22.816V33.344H17.488Z" fill="white"/>
        <defs>
            <linearGradient id="paint0_linear_1_2" x1="24" y1="0" x2="24" y2="48" gradientUnits="userSpaceOnUse">
                <stop stopColor="#FDB813"/>
                <stop offset="1" stopColor="#F90"/>
            </linearGradient>
        </defs>
    </svg>
);

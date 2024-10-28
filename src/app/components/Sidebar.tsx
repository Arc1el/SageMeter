'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSidebar } from '@/app/contexts/SidebarContext';

const menuItems = [
  { name: '엔드포인트 및 요청 설정', path: '/endpoint-config' },
  { name: 'Test Execution', path: '/test-execution' },
  { name: 'Monitoring & Analysis', path: '/monitoring' },
  { name: 'SageMaker Features', path: '/sagemaker-features' },
  { name: 'Cost Analysis', path: '/cost-analysis' },
  { name: 'CloudWatch Integration', path: '/cloudwatch-integration' },
  { name: 'Reporting', path: '/reporting' },
];

const Sidebar = () => {
  const pathname = usePathname();
  const { isOpen, setIsOpen } = useSidebar();

  return (
    <>
      <button
        className={`fixed top-4 ${isOpen ? 'left-64' : 'left-4'} z-20 p-2 text-apple-dark opacity-50 hover:opacity-100 transition-all duration-300 ease-in-out`}
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? '<<' : '>>'}
      </button>
      <div className={`fixed top-0 left-0 h-full bg-white text-apple-dark w-64 shadow-lg transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-4 pt-16">
          <h1 className="text-2xl font-bold mb-6 text-apple-blue">SageMeter</h1>
          <nav>
            <ul>
              {menuItems.map((item) => (
                <li key={item.path} className="mb-2">
                  <Link href={item.path}>
                    <span
                      className={`block p-2 rounded transition-colors duration-200 ease-in-out ${
                        pathname === item.path
                          ? 'bg-apple-blue text-white'
                          : 'hover:bg-apple-gray'
                      }`}
                    >
                      {item.name}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </div>
    </>
  );
};

export default Sidebar;

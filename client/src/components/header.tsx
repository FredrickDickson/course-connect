import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { Menu, X, User, BookOpen, GraduationCap, MessageSquare, LogOut, Presentation } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LanguageSwitcher } from "@/components/language-switcher";
import cimaLogo from "@/assets/cima-logo.png";

export default function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [location] = useLocation();
  const { user, isAuthenticated, isInstructor } = useAuth();
  const { t } = useLanguage();

  const navigation = [
    { name: t('nav.home'), href: "/", icon: BookOpen },
    { name: t('nav.courses'), href: "/courses", icon: GraduationCap, authRequired: true },
    { name: t('nav.dashboard'), href: "/dashboard", icon: User, authRequired: true },
    { name: "Instructor", href: "/instructor", icon: Presentation, authRequired: true, instructorOnly: true },
    { name: "Community", href: "/community", icon: MessageSquare, authRequired: true },
  ];

  const isActivePath = (path: string) => {
    if (path === "/" && location === "/") return true;
    if (path !== "/" && location.startsWith(path)) return true;
    return false;
  };

  const filteredNavigation = navigation.filter(
    (item) => {
      if (item.authRequired && !isAuthenticated) return false;
      if (item.instructorOnly && !isInstructor()) return false;
      return true;
    }
  );

  const UserMenu = () => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-10 w-10 rounded-full">
          <Avatar className="h-10 w-10">
            <AvatarImage
              src={user?.profileImageUrl || undefined}
              alt={`${user?.firstName} ${user?.lastName}`}
            />
            <AvatarFallback className="bg-primary text-primary-foreground">
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">
              {user?.firstName} {user?.lastName}
            </p>
            <p className="text-xs leading-none text-muted-foreground">
              {user?.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/profile" className="cursor-pointer">
            <User className="mr-2 h-4 w-4" />
            {t('nav.profile')}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/dashboard" className="cursor-pointer">
            <GraduationCap className="mr-2 h-4 w-4" />
            {t('nav.dashboard')}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <a href="/api/logout" className="cursor-pointer">
            <LogOut className="mr-2 h-4 w-4" />
            {t('nav.logout')}
          </a>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="max-w-7xl mx-auto">
        <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-3 hover:opacity-90 transition-opacity">
            <img 
              src={cimaLogo} 
              alt="CIMA Logo" 
              className="h-12 w-auto"
            />
            <div className="hidden sm:block">
              <h1 className="text-xl font-bold text-primary">CIMA Learn</h1>
              <p className="text-xs text-muted-foreground -mt-1">Professional ADR Education</p>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-1">
            {filteredNavigation.map((item) => {
              const Icon = item.icon;
              return (
                <Link key={item.name} href={item.href}>
                  <Button
                    variant={isActivePath(item.href) ? "default" : "ghost"}
                    size="sm"
                    className="flex items-center space-x-2"
                    data-testid={`nav-${item.name.toLowerCase()}`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.name}</span>
                  </Button>
                </Link>
              );
            })}
          </nav>

          {/* User Actions */}
          <div className="flex items-center space-x-4">
            {/* Language Switcher */}
            <LanguageSwitcher />
            
            {/* Desktop Auth */}
            <div className="hidden md:flex items-center space-x-3">
              {isAuthenticated ? (
                <UserMenu />
              ) : (
                <div className="flex items-center space-x-2">
                  <a href="/api/login">
                    <Button variant="ghost" size="sm" data-testid="button-sign-in">
                      <User className="h-4 w-4 mr-2" />
                      {t('nav.login')}
                    </Button>
                  </a>
                  <a href="/api/login">
                    <Button size="sm" data-testid="button-get-started">
                      <GraduationCap className="h-4 w-4 mr-2" />
                      {t('landing.getStarted')}
                    </Button>
                  </a>
                </div>
              )}
            </div>

            {/* Mobile Menu */}
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="md:hidden"
                  data-testid="mobile-menu-trigger"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-80">
                <div className="flex flex-col h-full">
                  {/* Mobile Header */}
                  <div className="flex items-center justify-between pb-4 border-b">
                    <div className="flex items-center space-x-3">
                      <img 
                        src={cimaLogo} 
                        alt="CIMA Logo" 
                        className="h-10 w-auto"
                      />
                      <div>
                        <h2 className="font-bold text-primary">CIMA Learn</h2>
                        <p className="text-xs text-muted-foreground">Professional ADR Education</p>
                      </div>
                    </div>
                  </div>

                  {/* Mobile Navigation */}
                  <nav className="flex-1 pt-6">
                    <div className="space-y-1">
                      {filteredNavigation.map((item) => {
                        const Icon = item.icon;
                        return (
                          <Link
                            key={item.name}
                            href={item.href}
                            onClick={() => setIsMobileMenuOpen(false)}
                          >
                            <Button
                              variant={isActivePath(item.href) ? "default" : "ghost"}
                              className="w-full justify-start"
                              data-testid={`mobile-nav-${item.name.toLowerCase()}`}
                            >
                              <Icon className="mr-3 h-4 w-4" />
                              {item.name}
                            </Button>
                          </Link>
                        );
                      })}
                    </div>
                  </nav>

                  {/* Mobile Auth */}
                  <div className="border-t pt-4">
                    {isAuthenticated ? (
                      <div className="space-y-3">
                        <div className="flex items-center space-x-3 px-3 py-2">
                          <Avatar className="h-10 w-10">
                            <AvatarImage
                              src={user?.profileImageUrl || undefined}
                              alt={`${user?.firstName} ${user?.lastName}`}
                            />
                            <AvatarFallback className="bg-primary text-primary-foreground">
                              {user?.firstName?.[0]}{user?.lastName?.[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {user?.firstName} {user?.lastName}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {user?.email}
                            </p>
                          </div>
                        </div>
                        <div className="space-y-1">
                          <Link href="/profile" onClick={() => setIsMobileMenuOpen(false)}>
                            <Button variant="ghost" className="w-full justify-start">
                              <User className="mr-3 h-4 w-4" />
                              {t('nav.profile')}
                            </Button>
                          </Link>
                          <a href="/api/logout">
                            <Button variant="ghost" className="w-full justify-start">
                              <LogOut className="mr-3 h-4 w-4" />
                              {t('nav.logout')}
                            </Button>
                          </a>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <a href="/api/login" onClick={() => setIsMobileMenuOpen(false)}>
                          <Button variant="ghost" className="w-full justify-start" data-testid="mobile-sign-in">
                            <User className="mr-3 h-4 w-4" />
                            {t('nav.login')}
                          </Button>
                        </a>
                        <a href="/api/login" onClick={() => setIsMobileMenuOpen(false)}>
                          <Button className="w-full justify-start" data-testid="mobile-get-started">
                            <GraduationCap className="mr-3 h-4 w-4" />
                            {t('landing.getStarted')}
                          </Button>
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
}
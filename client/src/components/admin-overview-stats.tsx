/**
 * Admin Overview Stats
 * Year selector, summary cards, YoY comparison charts
 */
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  ChevronRight,
  Users,
  CheckCircle,
  Clock,
  DollarSign,
  BookOpen,
  CalendarDays,
  TrendingUp,
  AlertCircle,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";

export default function AdminOverviewStats() {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);

  // Fetch all enrollments (course_enrollments) for stats
  const { data: allEnrollments = [] } = useQuery({
    queryKey: ["admin-all-enrollments"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("course_enrollments")
        .select("*, course:courses(title)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch courses
  const { data: allCourses = [] } = useQuery({
    queryKey: ["admin-all-courses-overview"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch waitlist
  const { data: waitlist = [] } = useQuery({
    queryKey: ["admin-waitlist-count"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("course_waitlist")
        .select("id, created_at");
      if (error) throw error;
      return data || [];
    },
  });

  // Filter enrollments by year
  const yearEnrollments = useMemo(
    () =>
      allEnrollments.filter(
        (e: any) => new Date(e.created_at).getFullYear() === selectedYear
      ),
    [allEnrollments, selectedYear]
  );

  const yearCourses = useMemo(
    () =>
      allCourses.filter(
        (c: any) => new Date(c.created_at).getFullYear() === selectedYear
      ),
    [allCourses, selectedYear]
  );

  // Summary stats for selected year
  const stats = useMemo(() => {
    const confirmed = yearEnrollments.filter(
      (e: any) => e.payment_status === "confirmed"
    );
    const pending = yearEnrollments.filter(
      (e: any) =>
        e.payment_status === "pending_bank" ||
        e.payment_status === "pending_invoice"
    );
    const revenue = confirmed.reduce(
      (sum: number, e: any) => sum + Number(e.ticket_price || 0),
      0
    );
    const publishedCourses = yearCourses.filter((c: any) => c.is_published);
    const yearWaitlist = waitlist.filter(
      (w: any) => new Date(w.created_at).getFullYear() === selectedYear
    );

    return {
      totalEnrollments: yearEnrollments.length,
      confirmed: confirmed.length,
      pending: pending.length,
      revenue,
      totalCourses: yearCourses.length,
      liveCourses: publishedCourses.length,
      waitlisted: yearWaitlist.length,
    };
  }, [yearEnrollments, yearCourses, waitlist, selectedYear]);

  // YoY comparison data (last 3 years)
  const yoyData = useMemo(() => {
    const years = [selectedYear - 2, selectedYear - 1, selectedYear];
    return years.map((year) => {
      const yearE = allEnrollments.filter(
        (e: any) => new Date(e.created_at).getFullYear() === year
      );
      const confirmed = yearE.filter(
        (e: any) => e.payment_status === "confirmed"
      );
      const associateCount = yearE.filter(
        (e: any) => e.ticket_type === "associate"
      ).length;
      const memberCount = yearE.filter(
        (e: any) => e.ticket_type === "member"
      ).length;
      const fellowCount = yearE.filter(
        (e: any) => e.ticket_type === "fellow"
      ).length;
      const revenue = confirmed.reduce(
        (sum: number, e: any) => sum + Number(e.ticket_price || 0),
        0
      );

      return {
        year: year.toString(),
        label: year === currentYear ? `${year} (YTD)` : year.toString(),
        enrolled: yearE.length,
        associate: associateCount,
        member: memberCount,
        fellow: fellowCount,
        revenue: Math.round(revenue / 1000),
      };
    });
  }, [allEnrollments, selectedYear, currentYear]);

  // Revenue per course (current year)
  const revenuePerCourse = useMemo(() => {
    const courseMap: Record<string, { title: string; revenue: number; count: number }> = {};
    yearEnrollments
      .filter((e: any) => e.payment_status === "confirmed")
      .forEach((e: any) => {
        const title = e.course?.title || "Unknown";
        if (!courseMap[title]) courseMap[title] = { title, revenue: 0, count: 0 };
        courseMap[title].revenue += Number(e.ticket_price || 0);
        courseMap[title].count += 1;
      });
    return Object.values(courseMap)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 8);
  }, [yearEnrollments]);

  return (
    <div className="space-y-6">
      {/* Year Selector */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-foreground">
          {selectedYear} Overview
        </h2>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => setSelectedYear((y) => y - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="font-semibold text-lg min-w-[60px] text-center">
            {selectedYear}
          </span>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => setSelectedYear((y) => y + 1)}
            disabled={selectedYear >= currentYear}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Summary Cards - Row 1 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            icon: Users,
            label: "Total Enrollments",
            value: stats.totalEnrollments,
            color: "text-primary",
          },
          {
            icon: CheckCircle,
            label: "Confirmed Paid",
            value: stats.confirmed,
            color: "text-green-600",
          },
          {
            icon: Clock,
            label: "Pending Payment",
            value: stats.pending,
            color: "text-amber-600",
          },
          {
            icon: DollarSign,
            label: `Revenue (GHS)`,
            value: `GHS ${stats.revenue.toLocaleString()}`,
            color: "text-green-600",
          },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4 flex items-center gap-3">
              <s.icon className={`w-8 h-8 ${s.color}`} />
              <div>
                <p className="text-2xl font-bold">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Summary Cards - Row 2 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            icon: BookOpen,
            label: "Courses Live",
            value: stats.liveCourses,
            color: "text-primary",
          },
          {
            icon: CalendarDays,
            label: "Total Courses",
            value: stats.totalCourses,
            color: "text-blue-600",
          },
          {
            icon: TrendingUp,
            label: "This Year Total",
            value: stats.totalCourses,
            color: "text-purple-600",
          },
          {
            icon: AlertCircle,
            label: "Waitlisted",
            value: stats.waitlisted,
            color: "text-amber-600",
          },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4 flex items-center gap-3">
              <s.icon className={`w-8 h-8 ${s.color}`} />
              <div>
                <p className="text-2xl font-bold">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar chart: Enrollments per year (grouped by ticket) */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Enrollments by Ticket Type — Year-on-Year
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={yoyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar
                  dataKey="associate"
                  name="Associate"
                  fill="hsl(var(--primary))"
                  radius={[2, 2, 0, 0]}
                />
                <Bar
                  dataKey="member"
                  name="Member"
                  fill="hsl(var(--primary) / 0.6)"
                  radius={[2, 2, 0, 0]}
                />
                <Bar
                  dataKey="fellow"
                  name="Fellow"
                  fill="#d97706"
                  radius={[2, 2, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Line chart: Annual revenue trend */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Annual Revenue Trend (GHS, thousands)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={yoyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" />
                <YAxis />
                <Tooltip
                  formatter={(value: number) => [
                    `GHS ${value}k`,
                    "Revenue",
                  ]}
                />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="hsl(var(--primary))"
                  strokeWidth={3}
                  dot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Bar chart: Associate vs Fellow split per year */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Associate vs Fellow vs Member Split
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={yoyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar
                  dataKey="associate"
                  name="Associate"
                  stackId="a"
                  fill="hsl(var(--primary))"
                />
                <Bar
                  dataKey="member"
                  name="Member"
                  stackId="a"
                  fill="hsl(var(--primary) / 0.5)"
                />
                <Bar
                  dataKey="fellow"
                  name="Fellow"
                  stackId="a"
                  fill="#d97706"
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Bar chart: Revenue per course (current year) */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Revenue per Course — {selectedYear}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {revenuePerCourse.length === 0 ? (
              <div className="flex items-center justify-center h-[280px] text-muted-foreground text-sm">
                No revenue data for {selectedYear}
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart
                  data={revenuePerCourse}
                  layout="vertical"
                  margin={{ left: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis
                    dataKey="title"
                    type="category"
                    width={120}
                    tick={{ fontSize: 11 }}
                  />
                  <Tooltip
                    formatter={(value: number) => [
                      `GHS ${value.toLocaleString()}`,
                      "Revenue",
                    ]}
                  />
                  <Bar
                    dataKey="revenue"
                    fill="hsl(var(--primary))"
                    radius={[0, 4, 4, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* YoY Comparison Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">
            Year-on-Year Comparison
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-3 font-medium">Metric</th>
                  {yoyData.map((y) => (
                    <th key={y.year} className="text-right p-3 font-medium">
                      {y.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="p-3 font-medium">Total Enrolled</td>
                  {yoyData.map((y) => (
                    <td key={y.year} className="p-3 text-right">
                      {y.enrolled}
                    </td>
                  ))}
                </tr>
                <tr className="border-b">
                  <td className="p-3">Associate Tickets</td>
                  {yoyData.map((y) => (
                    <td key={y.year} className="p-3 text-right">
                      {y.associate}
                    </td>
                  ))}
                </tr>
                <tr className="border-b">
                  <td className="p-3">Member Tickets</td>
                  {yoyData.map((y) => (
                    <td key={y.year} className="p-3 text-right">
                      {y.member}
                    </td>
                  ))}
                </tr>
                <tr className="border-b">
                  <td className="p-3">Fellow Tickets</td>
                  {yoyData.map((y) => (
                    <td key={y.year} className="p-3 text-right">
                      {y.fellow}
                    </td>
                  ))}
                </tr>
                <tr className="border-b bg-muted/30">
                  <td className="p-3 font-semibold">Revenue (GHS)</td>
                  {yoyData.map((y) => (
                    <td key={y.year} className="p-3 text-right font-semibold">
                      {y.revenue}k
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

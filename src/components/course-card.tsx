import Link from "next/link";
import { BookOpen, Clock, Star, Users } from "lucide-react";
import { Badge, Card } from "@/components/ui/card";
import type { CatalogCourse } from "@/lib/catalog";
import { formatDuration, plural } from "@/lib/utils";

export function CourseCard({ course }: { course: CatalogCourse }) {
  return (
    <Link href={`/courses/${course.slug}`} className="group">
      <Card className="flex h-full flex-col overflow-hidden transition-shadow group-hover:shadow-md">
        <div className="relative aspect-video bg-gradient-to-br from-primary/30 to-accent">
          {course.thumbnailUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={course.thumbnailUrl} alt="" className="size-full object-cover" loading="lazy" />
          ) : (
            <BookOpen className="absolute inset-0 m-auto size-10 text-primary/60" />
          )}
          <Badge className="absolute left-3 top-3 bg-card/90 text-foreground capitalize">{course.level}</Badge>
        </div>
        <div className="flex flex-1 flex-col p-4">
          <span className="text-xs font-medium text-primary">{course.category}</span>
          <h3 className="mt-1 line-clamp-2 font-semibold group-hover:text-primary">{course.title}</h3>
          {course.subtitle && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{course.subtitle}</p>}
          <p className="mt-2 text-xs text-muted-foreground">by {course.instructorName}</p>
          <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-4 text-xs text-muted-foreground">
            {course.stats.ratingCount > 0 && (
              <span className="flex items-center gap-1 font-medium text-foreground">
                <Star className="size-3.5 fill-amber-400 text-amber-400" />
                {course.stats.ratingAvg.toFixed(1)}
                <span className="font-normal text-muted-foreground">({course.stats.ratingCount})</span>
              </span>
            )}
            <span className="flex items-center gap-1">
              <Users className="size-3.5" /> {course.stats.enrollments}
            </span>
            <span className="flex items-center gap-1">
              <BookOpen className="size-3.5" /> {plural(course.stats.lessonCount, "lesson")}
            </span>
            {course.stats.totalMinutes > 0 && (
              <span className="flex items-center gap-1">
                <Clock className="size-3.5" /> {formatDuration(course.stats.totalMinutes)}
              </span>
            )}
          </div>
        </div>
      </Card>
    </Link>
  );
}

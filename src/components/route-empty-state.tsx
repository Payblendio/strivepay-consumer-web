import Image from "next/image";

type RouteEmptyStateProps={
  title:string;
  detail:string;
  imageSrc:string;
  children?:React.ReactNode;
};

export function RouteEmptyState({title,detail,imageSrc,children}:RouteEmptyStateProps){
  return <div className="route-empty-state" role="status">
    <span className="route-empty-state-art" aria-hidden="true"><Image src={imageSrc} alt="" width={176} height={176} sizes="(max-width: 680px) 112px, 144px" /></span>
    <strong>{title}</strong>
    <p>{detail}</p>
    {children?<div className="route-empty-state-actions">{children}</div>:null}
  </div>;
}

import { useState } from 'react';
import {
  FolderTree,
  Settings,
  Search,
  ChevronRight,
  ChevronDown,
} from 'lucide-react';
import { useAssets, useAsset, useAssetReadings } from '@/api/hooks';
import SensorChart from '@/components/charts/SensorChart';

const ASSET_ICONS: Record<string, typeof FolderTree> = {
  area: FolderTree,
  equipment: Settings,
  inspection_point: Search,
};

function AssetIcon({ type }: { type: string }) {
  const Icon = ASSET_ICONS[type?.toLowerCase()] ?? FolderTree;
  return <Icon className="h-4 w-4 shrink-0 text-gray-400" />;
}

type AssetNode = {
  assetId?: string;
  asset_id?: string;
  name?: string;
  assetType?: string;
  asset_type?: string;
  siteId?: string;
  site_id?: string;
  site?: { name?: string };
  children?: AssetNode[];
};

function buildTree(assets: AssetNode[]): AssetNode[] {
  const byId = new Map<string, AssetNode>();
  const roots: AssetNode[] = [];
  for (const a of assets) {
    const id = a.assetId ?? a.asset_id ?? '';
    byId.set(id, { ...a, children: [] });
  }
  for (const a of assets) {
    const id = a.assetId ?? a.asset_id ?? '';
    const node = byId.get(id)!;
    const parentId = (a as { parentAssetId?: string; parent_asset_id?: string }).parentAssetId
      ?? (a as { parentAssetId?: string; parent_asset_id?: string }).parent_asset_id;
    if (parentId && byId.has(parentId)) {
      const parent = byId.get(parentId)!;
      parent.children = parent.children ?? [];
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  }
  return roots;
}

function groupBySite(roots: AssetNode[]): Map<string, AssetNode[]> {
  const bySite = new Map<string, AssetNode[]>();
  function visit(n: AssetNode) {
    const siteName = (n.site as { name?: string })?.name ?? n.siteId ?? n.site_id ?? 'Unknown';
    if (!bySite.has(siteName)) bySite.set(siteName, []);
    bySite.get(siteName)!.push(n);
    (n.children ?? []).forEach(visit);
  }
  roots.forEach(visit);
  return bySite;
}

function TreeItem({
  asset,
  selectedId,
  onSelect,
  level = 0,
}: {
  asset: AssetNode;
  selectedId: string | null;
  onSelect: (id: string) => void;
  level?: number;
}) {
  const id = asset.assetId ?? asset.asset_id ?? '';
  const isSelected = selectedId === id;
  const children = asset.children ?? [];
  const [expanded, setExpanded] = useState(level < 1);

  return (
    <div className="select-none">
      <div
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && onSelect(id)}
        className={`flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-gray-800 ${
          isSelected ? 'bg-gray-800 text-white' : 'text-gray-300'
        }`}
        style={{ paddingLeft: `${level * 12 + 8}px` }}
        onClick={() => onSelect(id)}
      >
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setExpanded((x) => !x);
          }}
          className="rounded p-0.5 hover:bg-gray-700"
        >
          {children.length > 0 ? (
            expanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )
          ) : (
            <span className="inline-block w-4" />
          )}
        </button>
        <AssetIcon type={asset.assetType ?? asset.asset_type ?? 'area'} />
        <span className="truncate">{asset.name ?? 'Unnamed'}</span>
      </div>
      {expanded &&
        children.map((child) => (
          <TreeItem
            key={child.assetId ?? child.asset_id}
            asset={child}
            selectedId={selectedId}
            onSelect={onSelect}
            level={level + 1}
          />
        ))}
    </div>
  );
}

export default function Assets() {
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const { data: assets = [] } = useAssets();
  const { data: asset } = useAsset(selectedAssetId ?? undefined);
  const { data: readings } = useAssetReadings(selectedAssetId ?? undefined, {
    limit: 200,
  });

  const assetsArray = Array.isArray(assets) ? assets : assets?.data ?? assets ?? [];
  const tree = buildTree(assetsArray as AssetNode[]);
  const bySite = groupBySite(tree);

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-6">
      {/* Left panel - tree */}
      <div className="w-72 shrink-0 overflow-y-auto rounded-xl border border-gray-800 bg-gray-900 p-4">
        <h2 className="mb-4 text-lg font-medium text-gray-100">Asset Hierarchy</h2>
        <div className="space-y-4">
          {Array.from(bySite.entries()).map(([siteName, siteAssets]) => (
            <div key={siteName}>
              <p className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-500">
                {siteName}
              </p>
              {siteAssets.filter((a) => !(a as { parentAssetId?: string }).parentAssetId && !(a as { parent_asset_id?: string }).parent_asset_id).map((a) => (
                <TreeItem
                  key={a.assetId ?? a.asset_id}
                  asset={a}
                  selectedId={selectedAssetId}
                  onSelect={setSelectedAssetId}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Right panel - details */}
      <div className="min-w-0 flex-1 overflow-y-auto">
        {selectedAssetId ? (
          <div className="space-y-6">
            <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
              <h3 className="text-lg font-medium text-gray-100">
                {(asset as { name?: string })?.name ?? 'Asset'}
              </h3>
              <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
                <dt className="text-gray-500">Type</dt>
                <dd className="text-gray-200">
                  {(asset as { assetType?: string; asset_type?: string })?.assetType ??
                    (asset as { assetType?: string; asset_type?: string })?.asset_type ??
                    'N/A'}
                </dd>
                <dt className="text-gray-500">Site</dt>
                <dd className="text-gray-200">
                  {((asset as { site?: { name?: string } })?.site?.name) ?? 'N/A'}
                </dd>
                <dt className="text-gray-500">Description</dt>
                <dd className="text-gray-200">
                  {(asset as { description?: string })?.description ?? '—'}
                </dd>
              </dl>
            </div>
            <SensorChart
              title="Sensor Readings"
              data={Array.isArray(readings) ? readings : readings?.data ?? readings ?? []}
              valueKey="value"
            />
          </div>
        ) : (
          <div className="flex h-64 items-center justify-center rounded-xl border border-gray-800 bg-gray-900 text-gray-500">
            Select an asset to view details
          </div>
        )}
      </div>
    </div>
  );
}
